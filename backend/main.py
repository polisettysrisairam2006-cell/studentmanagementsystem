import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from backend.app.core.config import settings
from backend.app.core.database import engine, Base
from backend.app.routes import (
    auth_router,
    departments_router,
    subjects_router,
    students_router,
    marks_router,
    attendance_router,
    dashboard_router,
    reports_router
)

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Comprehensive REST API backend for Student Management System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth_router)
app.include_router(departments_router)
app.include_router(subjects_router)
app.include_router(students_router)
app.include_router(marks_router)
app.include_router(attendance_router)
app.include_router(dashboard_router)
app.include_router(reports_router)

# Mount Frontend static files
frontend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.exists(frontend_path):
    app.mount("/static", StaticFiles(directory=frontend_path), name="static")

    @app.get("/", include_in_schema=False)
    def serve_frontend_spa():
        """Serve SPA index.html at root."""
        return FileResponse(os.path.join(frontend_path, "index.html"))

@app.get("/health", tags=["Health Check"])
def health_check():
    """Service health status check endpoint."""
    return {"status": "online", "system": settings.PROJECT_NAME, "database": "connected"}
