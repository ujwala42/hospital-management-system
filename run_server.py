import uvicorn
import main

if __name__ == "__main__":
    print("Launching Hospital Management System FastAPI Server...")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
