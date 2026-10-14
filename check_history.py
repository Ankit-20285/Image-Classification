import sqlite3

connection = sqlite3.connect("predictions.db")
cursor = connection.cursor()

cursor.execute("SELECT * FROM predictions")

rows = cursor.fetchall()

for row in rows:
    print(row)

connection.close()