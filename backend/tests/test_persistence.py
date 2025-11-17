"""
Test for in-memory database persistence functionality
"""
import tempfile
import shutil
from pathlib import Path
from datetime import datetime
from app.models import InMemoryDatabase, User, Document, Coordinates, Extraction, Annotation


def test_database_persistence():
    """Test that database can save and load data from disk"""
    # Create a temporary directory for testing
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create first database instance
        db1 = InMemoryDatabase(persistence_dir=tmpdir)
        
        # Add some test data
        user_id = db1.generate_id()
        now = datetime.utcnow()
        
        user = User(
            id=user_id,
            email="test@example.com",
            password_hash="hashed_password",
            created_at=now,
            updated_at=now
        )
        
        db1.users[user_id] = user
        db1.users_by_email["test@example.com"] = user_id
        
        # Add a document
        doc_id = db1.generate_id()
        document = Document(
            id=doc_id,
            user_id=user_id,
            filename="test.pdf",
            total_pages=10,
            upload_date=now,
            pdf_data="base64_encoded_pdf_data",
            metadata={"title": "Test Document"}
        )
        
        db1.documents[doc_id] = document
        db1.documents_by_user[user_id] = [doc_id]
        
        # Add an extraction
        ext_id = db1.generate_id()
        extraction = Extraction(
            id=ext_id,
            document_id=doc_id,
            user_id=user_id,
            field_name="test_field",
            text="test extraction",
            page=1,
            coordinates=Coordinates(x=10.0, y=20.0, width=100.0, height=50.0),
            method="manual",
            timestamp=now
        )
        
        db1.extractions[ext_id] = extraction
        db1.extractions_by_document[doc_id] = [ext_id]
        db1.extractions_by_user[user_id] = [ext_id]
        
        # Add an annotation
        ann_id = db1.generate_id()
        annotation = Annotation(
            id=ann_id,
            document_id=doc_id,
            user_id=user_id,
            page_num=1,
            type="highlight",
            coordinates={"x": 10, "y": 20, "width": 100, "height": 50},
            content="test annotation",
            color="#FFFF00",
            created_at=now
        )
        
        db1.annotations[ann_id] = annotation
        db1.annotations_by_document[doc_id] = [ann_id]
        db1.annotations_by_user[user_id] = [ann_id]
        
        # Persist to disk
        db1.persist()
        
        # Verify snapshot file exists
        snapshot_file = Path(tmpdir) / "db_snapshot.json"
        assert snapshot_file.exists(), "Snapshot file should exist"
        
        # Create a new database instance (should load from disk)
        db2 = InMemoryDatabase(persistence_dir=tmpdir)
        
        # Verify data was recovered
        assert len(db2.users) == 1, "Should have 1 user"
        assert user_id in db2.users, "User should be loaded"
        assert db2.users[user_id].email == "test@example.com"
        assert "test@example.com" in db2.users_by_email
        
        assert len(db2.documents) == 1, "Should have 1 document"
        assert doc_id in db2.documents, "Document should be loaded"
        assert db2.documents[doc_id].filename == "test.pdf"
        assert user_id in db2.documents_by_user
        
        assert len(db2.extractions) == 1, "Should have 1 extraction"
        assert ext_id in db2.extractions, "Extraction should be loaded"
        assert db2.extractions[ext_id].text == "test extraction"
        assert doc_id in db2.extractions_by_document
        
        assert len(db2.annotations) == 1, "Should have 1 annotation"
        assert ann_id in db2.annotations, "Annotation should be loaded"
        assert db2.annotations[ann_id].content == "test annotation"
        assert doc_id in db2.annotations_by_document
        
        print("✅ Persistence test passed!")


def test_empty_database():
    """Test that database works correctly when no snapshot exists"""
    with tempfile.TemporaryDirectory() as tmpdir:
        db = InMemoryDatabase(persistence_dir=tmpdir)
        
        assert len(db.users) == 0, "Should start with empty database"
        assert len(db.documents) == 0, "Should start with empty database"
        assert len(db.extractions) == 0, "Should start with empty database"
        assert len(db.annotations) == 0, "Should start with empty database"
        
        print("✅ Empty database test passed!")


if __name__ == "__main__":
    test_database_persistence()
    test_empty_database()
    print("\n✅ All persistence tests passed!")
