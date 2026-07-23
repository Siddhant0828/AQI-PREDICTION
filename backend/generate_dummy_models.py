import os
import pickle
import numpy as np
import tensorflow as tf
from sklearn.preprocessing import StandardScaler

# Ensure models directory exists
os.makedirs("models", exist_ok=True)

# 1. Create real scikit-learn scalers
scaler_x = StandardScaler()
scaler_y = StandardScaler()

# Fit them with dummy data so they are initialized
dummy_X = np.random.rand(10, 11)
dummy_Y = np.random.rand(10, 2)

scaler_x.fit(dummy_X)
scaler_y.fit(dummy_Y)

# 2. Save real scalers
with open(os.path.join("models", "scaler_x.pkl"), "wb") as f:
    pickle.dump(scaler_x, f)

with open(os.path.join("models", "scaler_y.pkl"), "wb") as f:
    pickle.dump(scaler_y, f)

# 3. Create a simple dummy Keras model
model = tf.keras.Sequential([
    tf.keras.layers.Input(shape=(11,)),
    tf.keras.layers.Dense(2, activation='linear')
])

# Set weights so it outputs something reasonable
weights = [np.zeros((11, 2)), np.array([45.0, 60.0])]
model.set_weights(weights)

model.save(os.path.join("models", "cnn_lstm.keras"))

print("Successfully generated real dummy models using scikit-learn in the 'models' directory.")
