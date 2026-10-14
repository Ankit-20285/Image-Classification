
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import main


# Resolve paths relative to this test file
PROJECT_DIR = Path(__file__).resolve().parent
TEST_IMAGE = PROJECT_DIR / "Prediction_Samples" / "glacier.jpg"

client = TestClient(main.app)


@pytest.fixture
def isolated_history(monkeypatch):
    """Use in-memory history instead of modifying predictions.db."""
    predictions = []

    def fake_save_prediction(filename, predicted_class, confidence_score):
        predictions.insert(
            0,
            {
                "id": len(predictions) + 1,
                "filename": filename,
                "predicted_class": predicted_class,
                "confidence_score": confidence_score,
                "timestamp": "2026-01-01 12:00:00",
            },
        )

    monkeypatch.setattr(main, "save_prediction", fake_save_prediction)
    monkeypatch.setattr(
        main,
        "get_predictions",
        lambda: predictions.copy(),
    )

    return predictions


def test_home():
    response = client.get("/")

    assert response.status_code == 200
    assert response.json()["message"] == (
        "Image Classification API is running!"
    )


def test_history(isolated_history):
    response = client.get("/history")

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_predict(isolated_history):
    assert TEST_IMAGE.exists(), f"Test image not found: {TEST_IMAGE}"

    with TEST_IMAGE.open("rb") as image:
        response = client.post(
            "/predict",
            files={
                "file": (
                    "glacier.jpg",
                    image,
                    "image/jpeg",
                )
            },
        )

    assert response.status_code == 200

    data = response.json()

    assert data["filename"] == "glacier.jpg"
    assert data["predicted_class"] in main.class_names
    assert isinstance(data["confidence_score"], (int, float))
    assert 0 <= data["confidence_score"] <= 1

    # Verify the prediction was saved to the isolated history
    history_response = client.get("/history")

    assert history_response.status_code == 200

    history = history_response.json()

    assert any(
        item["filename"] == data["filename"]
        for item in history
    )


def test_invalid_image():
    # Generate invalid image data directly; no fixture file needed.
    response = client.post(
        "/predict",
        files={
            "file": (
                "fake_image.jpg",
                b"This is not a valid image",
                "image/jpeg",
            )
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid image file."


def test_empty_image():
    response = client.post(
        "/predict",
        files={
            "file": (
                "empty.jpg",
                b"",
                "image/jpeg",
            )
        },
    )

    assert response.status_code == 400


def test_oversized_image():
    oversized_data = b"x" * (5 * 1024 * 1024 + 1)

    response = client.post(
        "/predict",
        files={
            "file": (
                "large.jpg",
                oversized_data,
                "image/jpeg",
            )
        },
    )

    assert response.status_code == 413


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
