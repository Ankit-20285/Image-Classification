
import numpy as np
import tensorflow as tf
from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError
from io import BytesIO
from database import save_prediction, get_predictions
from schemas import Classification
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Image Classification API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = "models/intel_cnn.keras"

class_names = [
    "buildings",
    "forest",
    "glacier",
    "mountain",
    "sea",
    "street"
]

# Load the trained model once when the application starts
model = tf.keras.models.load_model(MODEL_PATH)


@app.get("/")
def home():
    return {"message": "Image Classification API is running!"}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    # Read and validate the uploaded image
    try:
        # Read and validate the uploaded image in chunks
        image_bytes = b""
        MAX_FILE_SIZE = 5 * 1024 * 1024
        CHUNK_SIZE = 1024 * 1024

        while True:
            chunk = await file.read(CHUNK_SIZE)

            # Stop when there is no more data
            if chunk == b"":
                break

            # Accumulate the file data
            image_bytes += chunk

            # Reject files that exceed the size limit
            if len(image_bytes) > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail="Uploaded file exceeds the 5 MiB size limit."
                )

        if not image_bytes:
            raise HTTPException(
                status_code=400,
                detail="Uploaded file is empty."
            )
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
    except UnidentifiedImageError: 
        raise HTTPException(
                status_code=400,
                detail="Invalid image file."
                )

    # Resize to the model's expected input dimensions
    image = image.resize((150, 150))

    # Convert to a NumPy array and add the batch dimension
    image_array = np.array(image, dtype=np.float32)
    image_array = np.expand_dims(image_array, axis=0)

    # Predict: the model performs its own Rescaling(1./255)
    predictions = model.predict(image_array, verbose=0)[0]

    predicted_index = int(np.argmax(predictions))
    predicted_class = class_names[predicted_index]
    confidence_score = float(predictions[predicted_index])

    save_prediction(
        file.filename,
        predicted_class,
        confidence_score
    )

    return {
        "filename": file.filename,
        "predicted_class": predicted_class,
        "confidence_score": confidence_score
    }
    
@app.get("/history", response_model=list[Classification])
def history(): 
    history = get_predictions()
    return history

# python -m uvicorn main:app --reload