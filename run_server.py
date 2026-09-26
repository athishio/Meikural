import os
import uvicorn

if __name__ == "__main__":
    os.environ["DEMO_MODE"] = "1"
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=False, log_level="info")
