import tensorflow as tf
import numpy as np

# Load model
model = tf.keras.models.load_model("models/intel_cnn.keras")

# Image you want to test
image_path = "Prediction_Samples/glacier.jpg"

img = tf.keras.utils.load_img(
    image_path,
    target_size=(150, 150)
)

img_array = tf.keras.utils.img_to_array(img)
img_array = tf.expand_dims(img_array, 0)

predictions = model.predict(img_array, verbose=0)

class_names = [
    "buildings",
    "forest",
    "glacier",
    "mountain",
    "sea",
    "street"
]

# Prediction
predicted_index = np.argmax(predictions[0])
predicted_class = class_names[predicted_index]
confidence = predictions[0][predicted_index]

print(f"Prediction: {predicted_class}")
print(f"Confidence: {confidence:.2%}")