import tensorflow as tf
from tensorflow.keras.models import Sequential # type: ignore
from tensorflow.keras.layers import Conv2D, MaxPooling2D, Flatten, Dense # type: ignore
from tensorflow.keras.layers import Rescaling #type: ignore
from tensorflow.keras.layers import Dropout #type: ignore
from tensorflow.keras.callbacks import EarlyStopping #type: ignore
import numpy as np

DATASET = "path/to/your/dataset"

data_augmentation = tf.keras.Sequential([
    tf.keras.layers.RandomFlip("horizontal"),
    tf.keras.layers.RandomRotation(0.1),
    tf.keras.layers.RandomZoom(0.1)
])

model = Sequential([
    data_augmentation,
    tf.keras.layers.Rescaling(1./255),

    Conv2D(32, (3,3), activation='relu'),
    MaxPooling2D(),

    Conv2D(64, (3,3), activation='relu'),
    MaxPooling2D(),

    Conv2D(128, (3,3), activation='relu'),
    MaxPooling2D(),

    Flatten(),
    Dense(128, activation='relu'),
    Dropout(0.3),
    Dense(6, activation='softmax')
])

train_ds = tf.keras.utils.image_dataset_from_directory(
    DATASET + "/seg_train/seg_train",
    image_size=(150, 150),
    batch_size=32
)

test_ds = tf.keras.utils.image_dataset_from_directory(
    DATASET + "/seg_test/seg_test",
    image_size=(150, 150),
    batch_size=32
)


early_stop = EarlyStopping(
    monitor='val_loss',
    patience=5,
    restore_best_weights=True
)

model.compile(
    optimizer="adam",
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"]
)

history = model.fit(
    train_ds,
    validation_data=test_ds,
    epochs=20,
    callbacks=[early_stop]
)

model.save("intel_cnn.keras") 