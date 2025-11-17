"""
Circuit breaker pattern implementation for API resilience
Prevents cascade failures when external services (like Gemini API) are down
"""
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Callable, Any
from fastapi import HTTPException, status
import asyncio
import functools


class CircuitState(str, Enum):
    """Circuit breaker states"""
    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Service is down, reject all requests
    HALF_OPEN = "half_open"  # Testing if service is back


class CircuitBreaker:
    """
    Circuit breaker implementation for external API calls
    
    States:
    - CLOSED: Normal operation, all requests allowed
    - OPEN: Too many failures, reject all requests immediately
    - HALF_OPEN: Allow limited requests to test if service recovered
    
    Parameters:
    - failure_threshold: Number of failures before opening circuit (default: 5)
    - timeout: Seconds to wait before trying again (default: 60)
    - success_threshold: Successful calls needed to close circuit from half-open (default: 2)
    """
    
    def __init__(
        self,
        failure_threshold: int = 5,
        timeout: int = 60,
        success_threshold: int = 2
    ):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.success_threshold = success_threshold
        
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time: datetime = None
    
    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to attempt reset"""
        if self.last_failure_time is None:
            return True
        
        elapsed = (datetime.now(timezone.utc) - self.last_failure_time).total_seconds()
        return elapsed >= self.timeout
    
    def _record_success(self):
        """Record a successful call"""
        self.failure_count = 0
        
        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.success_threshold:
                self.state = CircuitState.CLOSED
                self.success_count = 0
    
    def _record_failure(self):
        """Record a failed call"""
        self.failure_count += 1
        self.last_failure_time = datetime.now(timezone.utc)
        self.success_count = 0
        
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
    
    def call(self, func: Callable, *args, **kwargs) -> Any:
        """
        Execute function with circuit breaker protection
        
        Args:
            func: Function to execute
            *args: Positional arguments for func
            **kwargs: Keyword arguments for func
            
        Returns:
            Function result
            
        Raises:
            HTTPException: If circuit is open (service unavailable)
        """
        # Check circuit state
        if self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self.state = CircuitState.HALF_OPEN
                self.success_count = 0
            else:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Service temporarily unavailable. Circuit breaker is OPEN. Try again in {self.timeout} seconds."
                )
        
        # Attempt the call
        try:
            result = func(*args, **kwargs)
            self._record_success()
            return result
        except Exception as e:
            self._record_failure()
            raise e
    
    async def call_async(self, func: Callable, *args, **kwargs) -> Any:
        """
        Execute async function with circuit breaker protection
        
        Args:
            func: Async function to execute
            *args: Positional arguments for func
            **kwargs: Keyword arguments for func
            
        Returns:
            Function result
            
        Raises:
            HTTPException: If circuit is open (service unavailable)
        """
        # Check circuit state
        if self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self.state = CircuitState.HALF_OPEN
                self.success_count = 0
            else:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Service temporarily unavailable. Circuit breaker is OPEN. Try again in {self.timeout} seconds."
                )
        
        # Attempt the call
        try:
            result = await func(*args, **kwargs)
            self._record_success()
            return result
        except Exception as e:
            self._record_failure()
            raise e
    
    def get_status(self) -> dict:
        """Get current circuit breaker status"""
        return {
            "state": self.state.value,
            "failure_count": self.failure_count,
            "success_count": self.success_count,
            "last_failure_time": self.last_failure_time.isoformat() if self.last_failure_time else None,
            "time_until_retry": max(0, self.timeout - (
                (datetime.now(timezone.utc) - self.last_failure_time).total_seconds()
                if self.last_failure_time else 0
            )) if self.state == CircuitState.OPEN else 0
        }


# Global circuit breaker instance for Gemini API
gemini_circuit_breaker = CircuitBreaker(
    failure_threshold=5,  # Open circuit after 5 failures
    timeout=60,  # Wait 60 seconds before retry
    success_threshold=2  # Need 2 successes to close circuit
)


def with_circuit_breaker(breaker: CircuitBreaker):
    """Decorator to apply circuit breaker to async functions"""
    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            return await breaker.call_async(func, *args, **kwargs)
        return wrapper
    return decorator
