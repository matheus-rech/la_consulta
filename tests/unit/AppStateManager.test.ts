import AppStateManager from '../../src/state/AppStateManager';

describe('AppStateManager', () => {
  beforeEach(() => {
    // Reset state using public API
    AppStateManager.__resetForTesting();
    // Set scale to 1.5 for tests that depend on it
    AppStateManager.setState({ scale: 1.5 });
  });

  describe('getState', () => {
    it('should return a deep copy of state', () => {
      const state1 = AppStateManager.getState();
      const state2 = AppStateManager.getState();
      
      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2);
      expect(state1.extractions).not.toBe(state2.extractions);
    });

    it('should clone Map objects correctly', () => {
      AppStateManager.setState({
        pdfTextCache: new Map([[1, { text: 'test', page: 1 }]]),
      });

      const state = AppStateManager.getState();
      expect(state.pdfTextCache.get(1)).toEqual({ text: 'test', page: 1 });
    });
  });

  describe('setState', () => {
    it('should merge partial state updates', () => {
      AppStateManager.setState({ currentPage: 5 });
      expect(AppStateManager.getState().currentPage).toBe(5);
      expect(AppStateManager.getState().scale).toBe(1.5);
    });

    it('should notify subscribers on state change', () => {
      const callback = jest.fn();
      AppStateManager.subscribe(callback);

      AppStateManager.setState({ currentPage: 3 });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ currentPage: 3 })
      );
    });

    it('should handle multiple subscribers', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      AppStateManager.subscribe(callback1);
      AppStateManager.subscribe(callback2);

      AppStateManager.setState({ isProcessing: true });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('subscribe', () => {
    it('should return unsubscribe function', () => {
      const callback = jest.fn();
      const unsubscribe = AppStateManager.subscribe(callback);

      AppStateManager.setState({ currentPage: 2 });
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();
      AppStateManager.setState({ currentPage: 3 });
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('mutex pattern', () => {
    it('should prevent concurrent operations with isProcessing flag', () => {
      expect(AppStateManager.getState().isProcessing).toBe(false);

      AppStateManager.setState({ isProcessing: true });
      expect(AppStateManager.getState().isProcessing).toBe(true);

      AppStateManager.setState({ isProcessing: false });
      expect(AppStateManager.getState().isProcessing).toBe(false);
    });
  });
});
