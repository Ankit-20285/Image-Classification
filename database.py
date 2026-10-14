import sqlite3

# Connect to the database (creates it if it doesn't exist)
connection = sqlite3.connect("predictions.db")

# Create a cursor to execute SQL commands
cursor = connection.cursor()

# Create the predictions table
cursor.execute("""
    CREATE TABLE IF NOT EXISTS predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        predicted_class TEXT NOT NULL,
        confidence_score REAL NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
""")

# Save changes and close the connection
connection.commit()
connection.close()

print("Database and table created successfully!")

def save_prediction(filename, predicted_class, confidence_score):
    connection = sqlite3.connect("predictions.db")
    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO predictions (filename, predicted_class, confidence_score)
        VALUES (?, ?, ?)
    """, (filename, predicted_class, confidence_score))

    cursor.execute("""
                   SELECT * FROM predictions ORDER BY id DESC
                   """)
    connection.commit()
    connection.close()

def get_predictions():
    connection = sqlite3.connect("predictions.db")
    cursor = connection.cursor()

    # Your SELECT query here
    cursor.execute("""
        SELECT * FROM predictions ORDER BY id DESC
    """)

    # Retrieve the results
    rows = cursor.fetchall()
    
    # Close the connection
    connection.close()

    # Return the results
    history = []
    
    for row in rows: 
        prediction = {
            "id": row[0],
            "filename": row[1],
            "predicted_class": row[2],
            "confidence_score": row[3],
            "timestamp": row[4]
        }
        history.append(prediction)
    
    return history