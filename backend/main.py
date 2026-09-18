import os
from typing import Optional
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from google import genai

from dotenv import load_dotenv
from fastapi import (
    FastAPI,
    HTTPException,
    UploadFile,
    File,
    Header,
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from supabase import Client, create_client
import json

load_dotenv()


# =====================================================
# SUPABASE
# =====================================================

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")

if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
    raise RuntimeError(
        "SUPABASE_URL or SUPABASE_SECRET_KEY is missing from .env"
    )


# =====================================================
# GEMINI AI
# =====================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY is missing from .env"
    )

gemini_client = genai.Client(
    api_key=GEMINI_API_KEY
)

if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
    raise RuntimeError(
        "SUPABASE_URL or SUPABASE_SECRET_KEY is missing from .env"
    )

supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_SECRET_KEY,
)
def get_authenticated_student(
    authorization: str | None
):
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authentication required."
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header."
        )

    token = authorization.replace("Bearer ", "", 1).strip()

    try:
        auth_response = supabase.auth.get_user(token)

        user = auth_response.user

        if not user:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired session."
            )

        profile_result = (
            supabase
            .table("profiles")
            .select(
                "id,auth_user_id,full_name,email,"
                "roll_number,phone,department_id,"
                "semester,role,is_active"
            )
            .eq("auth_user_id", user.id)
            .limit(1)
            .execute()
        )

        if not profile_result.data:
            raise HTTPException(
                status_code=404,
                detail="Student profile not found."
            )

        profile = profile_result.data[0]

        if profile["role"] != "student":
            raise HTTPException(
                status_code=403,
                detail="Student account required."
            )

        if not profile["is_active"]:
            raise HTTPException(
                status_code=403,
                detail="Student account is inactive."
            )

        return profile

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Unable to verify authentication session."
        )
SUPABASE_EVIDENCE_BUCKET = os.getenv(
    "SUPABASE_EVIDENCE_BUCKET",
    "complaint-evidence"
)

AUTOMATION_SECRET = os.getenv("AUTOMATION_SECRET")

if not AUTOMATION_SECRET:
    raise RuntimeError(
        "AUTOMATION_SECRET is missing from .env"
    )

app = FastAPI(
    title="QUEST Complaint Portal API",
    description="Backend API for QUEST Complaint Portal",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_authenticated_department_officer(
    authorization: str | None
):
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authentication required."
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header."
        )

    token = authorization.replace("Bearer ", "", 1).strip()

    try:
        auth_response = supabase.auth.get_user(token)
        user = auth_response.user

        if not user:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired session."
            )

        profile_result = (
            supabase
            .table("profiles")
            .select(
                "id,auth_user_id,full_name,email,"
                "department_id,role,is_active"
            )
            .eq("auth_user_id", user.id)
            .limit(1)
            .execute()
        )

        if not profile_result.data:
            raise HTTPException(
                status_code=404,
                detail="Officer profile not found."
            )

        profile = profile_result.data[0]

        if profile["role"] != "department_officer":
            raise HTTPException(
                status_code=403,
                detail="Department officer account required."
            )

        if not profile["is_active"]:
            raise HTTPException(
                status_code=403,
                detail="Officer account is inactive."
            )

        if not profile.get("department_id"):
            raise HTTPException(
                status_code=403,
                detail="Officer department is not assigned."
            )

        return profile

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Unable to verify officer session."
        )

def get_authenticated_admin(
    authorization: str | None
):
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authentication required."
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header."
        )

    token = authorization.replace("Bearer ", "", 1).strip()

    try:
        auth_response = supabase.auth.get_user(token)
        user = auth_response.user

        if not user:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired session."
            )

        profile_result = (
            supabase
            .table("profiles")
            .select(
                "id,auth_user_id,full_name,email,"
                "role,is_active"
            )
            .eq("auth_user_id", user.id)
            .limit(1)
            .execute()
        )

        if not profile_result.data:
            raise HTTPException(
                status_code=404,
                detail="Admin profile not found."
            )

        profile = profile_result.data[0]

        if profile["role"] not in ["admin", "super_admin"]:
            raise HTTPException(
                status_code=403,
                detail="Admin account required."
            )

        if not profile["is_active"]:
            raise HTTPException(
                status_code=403,
                detail="Admin account is inactive."
            )

        return profile

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Unable to verify admin session."
        )


@app.get("/admin/me")
def get_admin_me(
    authorization: str | None = Header(default=None),
):
    admin = get_authenticated_admin(authorization)

    return {
        "success": True,
        "admin": {
            "id": admin["id"],
            "full_name": admin["full_name"],
            "email": admin["email"],
            "role": admin["role"],
        },
    }
# =====================================================
# REQUEST MODEL
# =====================================================

class ComplaintCreate(BaseModel):
    student_name: str
    roll_number: str
    email: EmailStr
    phone: Optional[str] = None
    student_department_id: Optional[str] = None
    semester: Optional[int] = None
    category: str
    title: str
    description: str
    confidential: bool = False

    # AI advisory analysis
    ai_analyzed: bool = False
    ai_summary: Optional[str] = None
    ai_category: Optional[str] = None
    ai_priority: Optional[str] = None
    ai_urgency: Optional[str] = None
    ai_confidence: Optional[float] = None
    ai_reason: Optional[str] = None
    ai_recommended_department_id: Optional[str] = None
    ai_sla_hours: Optional[int] = None


# =====================================================
# BASIC ROUTES
# =====================================================

@app.get("/")
def root():
    return {
        "message": "QUEST Complaint Portal Backend is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "QUEST Complaint Portal API"
    }


# =====================================================
# DEPARTMENTS
# =====================================================

@app.get("/departments")
def get_departments():
    try:
        result = (
            supabase
            .table("departments")
            .select("id,name,department_type,is_active")
            .eq("is_active", True)
            .order("name")
            .execute()
        )

        return {
            "count": len(result.data or []),
            "departments": result.data or [],
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to load departments: {str(error)}"
        )


# =====================================================
# CREATE COMPLAINT
# =====================================================

@app.post("/complaints")
def create_complaint(
    complaint: ComplaintCreate,
    authorization: str | None = Header(default=None),
):
    try:
        # 1. Verify logged-in student
        student = get_authenticated_student(authorization)

        # 2. Find routing rule
        routing_result = (
            supabase
            .table("complaint_routing_rules")
            .select("*")
            .eq("category", complaint.category)
            .eq("is_active", True)
            .limit(1)
            .execute()
        )

        if not routing_result.data:
            raise HTTPException(
                status_code=400,
                detail="No active routing rule found for this category."
            )

        routing_rule = routing_result.data[0]

        # 3. Prepare SLA
        sla_hours = routing_rule["sla_hours"]

        sla_deadline = (
            datetime.now(timezone.utc)
            + timedelta(hours=sla_hours)
        )

        # 4. Decide assigned department
        assigned_department_id = None

        if routing_rule["routing_mode"] == "fixed":
            assigned_department_id = routing_rule.get(
                "target_department_id"
            )

        elif routing_rule["routing_mode"] == "student_department":
            assigned_department_id = student.get("department_id")

            if not assigned_department_id:
                raise HTTPException(
                    status_code=400,
                    detail="Student academic department is not configured."
                )

        # 5. Insert complaint
        complaint_result = (
            supabase
            .table("complaints")
            .insert({
                "student_id": student["id"],

                "student_name": student["full_name"],
                "roll_number": student["roll_number"],
                "email": student["email"],
                "phone": student.get("phone"),
                "student_department_id": student.get("department_id"),
                "semester": student.get("semester"),

                "category": complaint.category,
                "title": complaint.title.strip(),
                "description": complaint.description.strip(),
                "confidential": complaint.confidential,

                "priority": routing_rule["default_priority"],
                "status": "submitted",
                "assigned_department_id": assigned_department_id,

                "sla_hours": sla_hours,
                "sla_deadline": sla_deadline.isoformat(),
                "escalation_level": 0,

                # AI advisory analysis snapshot
                "ai_analyzed": complaint.ai_analyzed,
                "ai_summary": complaint.ai_summary,
                "ai_category": complaint.ai_category,
                "ai_priority": complaint.ai_priority,
                "ai_urgency": complaint.ai_urgency,
                "ai_confidence": complaint.ai_confidence,
                "ai_reason": complaint.ai_reason,
                "ai_recommended_department_id": (
                    complaint.ai_recommended_department_id
                ),
                "ai_sla_hours": complaint.ai_sla_hours,
                "ai_analyzed_at": (
                    datetime.now(timezone.utc).isoformat()
                    if complaint.ai_analyzed
                    else None
                ),
            })
            .execute()
        )

        if not complaint_result.data:
            raise HTTPException(
                status_code=500,
                detail="Complaint could not be created."
            )

        created_complaint = complaint_result.data[0]

        # 6. Create timeline/history entry
        supabase.table(
            "complaint_status_history"
        ).insert({
            "complaint_id": created_complaint["id"],
            "old_status": None,
            "new_status": "submitted",
            "remarks": "Complaint submitted by student.",
        }).execute()

        # 7. Get assigned department name
        assigned_department_name = None

        if assigned_department_id:
            department_result = (
                supabase
                .table("departments")
                .select("name")
                .eq("id", assigned_department_id)
                .limit(1)
                .execute()
            )

            if department_result.data:
                assigned_department_name = (
                    department_result.data[0]["name"]
                )

        # 8. Return response
        return {
            "success": True,
            "message": "Complaint submitted successfully.",
            "complaint": {
                "id": created_complaint["id"],
                "complaint_number": created_complaint["complaint_number"],
                "status": created_complaint["status"],
                "priority": created_complaint["priority"],
                "category": created_complaint["category"],
                "assigned_department": assigned_department_name,
                "sla_hours": sla_hours,
                "sla_deadline": sla_deadline.isoformat(),
                "submitted_at": created_complaint["submitted_at"],
                "ai_analyzed": created_complaint.get(
                    "ai_analyzed",
                    False
                ),
                "ai_category": created_complaint.get(
                    "ai_category"
                ),
                "ai_priority": created_complaint.get(
                    "ai_priority"
                ),
                "ai_urgency": created_complaint.get(
                    "ai_urgency"
                ),
                "ai_confidence": created_complaint.get(
                    "ai_confidence"
                ),
            }
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to submit complaint: {str(error)}"
        )


class OfficerComplaintStatusUpdate(BaseModel):
    status: str
    remarks: str | None = None

# =====================================================
# TRACK COMPLAINT
# =====================================================

@app.get("/complaints/{complaint_number}")
def get_complaint(
    complaint_number: str,
    authorization: str | None = Header(default=None),
):
    try:
        # 1. Verify logged-in student
        student = get_authenticated_student(authorization)

        clean_number = complaint_number.strip().upper()

        # 2. Get complaint ONLY if it belongs to logged-in student
        complaint_result = (
            supabase
            .table("complaints")
            .select(
                "id,complaint_number,title,category,priority,"
                "status,assigned_department_id,submitted_at,resolved_at"
            )
            .eq("complaint_number", clean_number)
            .eq("student_id", student["id"])
            .limit(1)
            .execute()
        )

        if not complaint_result.data:
            raise HTTPException(
                status_code=404,
                detail="Complaint not found or you do not have permission to view it."
            )

        complaint = complaint_result.data[0]

        # 3. Assigned department
        assigned_department_name = None

        if complaint.get("assigned_department_id"):
            department_result = (
                supabase
                .table("departments")
                .select("name")
                .eq(
                    "id",
                    complaint["assigned_department_id"]
                )
                .limit(1)
                .execute()
            )

            if department_result.data:
                assigned_department_name = (
                    department_result.data[0]["name"]
                )

        # 4. Complaint timeline
        history_result = (
            supabase
            .table("complaint_status_history")
            .select(
                "id,old_status,new_status,remarks,created_at"
            )
            .eq("complaint_id", complaint["id"])
            .order("created_at")
            .execute()
        )

        return {
            "complaint": {
                "complaint_number": complaint["complaint_number"],
                "title": complaint["title"],
                "category": complaint["category"],
                "priority": complaint["priority"],
                "status": complaint["status"],
                "assigned_department": assigned_department_name,
                "submitted_at": complaint["submitted_at"],
                "resolved_at": complaint["resolved_at"],
            },
            "history": history_result.data or [],
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to track complaint: {str(error)}"
        )
@app.post("/complaints/{complaint_number}/evidence")
async def upload_complaint_evidence(
    complaint_number: str,
    file: UploadFile = File(...),
    authorization: str | None = Header(default=None),
):
    try:
        # 1. Verify logged-in student
        student = get_authenticated_student(authorization)

        clean_number = complaint_number.strip().upper()

        # 2. Validate file type
        allowed_types = {
            "image/jpeg",
            "image/png",
            "application/pdf",
        }

        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail="Only JPG, PNG and PDF files are allowed."
            )

        # 3. Read and validate file size
        file_bytes = await file.read()

        if len(file_bytes) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="File size must not exceed 10 MB."
            )

        # 4. Complaint must belong to logged-in student
        complaint_result = (
            supabase
            .table("complaints")
            .select("id,complaint_number")
            .eq("complaint_number", clean_number)
            .eq("student_id", student["id"])
            .limit(1)
            .execute()
        )

        if not complaint_result.data:
            raise HTTPException(
                status_code=404,
                detail="Complaint not found or access denied."
            )

        complaint = complaint_result.data[0]

        # 5. Prepare safe file name
        original_name = file.filename or "evidence"

        safe_name = (
            original_name
            .replace(" ", "_")
            .replace("/", "_")
            .replace("\\", "_")
        )

        storage_path = (
            f"{clean_number}/"
            f"{uuid4().hex}_{safe_name}"
        )

        # 6. Upload to private Supabase Storage
        supabase.storage.from_(
            SUPABASE_EVIDENCE_BUCKET
        ).upload(
            path=storage_path,
            file=file_bytes,
            file_options={
                "content-type": file.content_type,
                "upsert": "false",
            },
        )

        # 7. Save attachment record
        attachment_result = (
            supabase
            .table("attachments")
            .insert({
                "complaint_id": complaint["id"],
                "file_name": original_name,
                "file_path": storage_path,
                "file_type": file.content_type,
                "file_size": len(file_bytes),
            })
            .execute()
        )

        return {
            "success": True,
            "message": "Evidence uploaded successfully.",
            "attachment": (
                attachment_result.data[0]
                if attachment_result.data
                else {
                    "file_name": original_name,
                    "file_path": storage_path,
                }
            ),
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to upload evidence: {str(error)}"
        )

@app.get("/complaints/{complaint_number}/evidence")
def get_student_complaint_evidence(
    complaint_number: str,
    authorization: str | None = Header(default=None),
):
    try:
        # 1. Verify logged-in student
        student = get_authenticated_student(authorization)

        clean_number = complaint_number.strip().upper()

        # 2. Student can only access own complaint
        complaint_result = (
            supabase
            .table("complaints")
            .select("id,complaint_number")
            .eq("complaint_number", clean_number)
            .eq("student_id", student["id"])
            .limit(1)
            .execute()
        )

        if not complaint_result.data:
            raise HTTPException(
                status_code=404,
                detail="Complaint not found or access denied."
            )

        complaint = complaint_result.data[0]

        # 3. Get attachments
        attachment_result = (
            supabase
            .table("attachments")
            .select(
                "id,file_name,file_path,file_type,"
                "file_size,created_at"
            )
            .eq("complaint_id", complaint["id"])
            .order("created_at")
            .execute()
        )

        evidence_files = []

        for attachment in attachment_result.data or []:
            signed_result = (
                supabase.storage
                .from_(SUPABASE_EVIDENCE_BUCKET)
                .create_signed_url(
                    attachment["file_path"],
                    3600
                )
            )

            signed_url = (
                signed_result.get("signedURL")
                or signed_result.get("signedUrl")
            )

            evidence_files.append({
                "id": attachment["id"],
                "file_name": attachment["file_name"],
                "file_type": attachment["file_type"],
                "file_size": attachment["file_size"],
                "created_at": attachment["created_at"],
                "signed_url": signed_url,
            })

        return {
            "success": True,
            "complaint_number": clean_number,
            "count": len(evidence_files),
            "evidence": evidence_files,
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to load evidence: {str(error)}"
        )
@app.get("/my-complaints")
def get_my_complaints(
    authorization: str | None = Header(default=None),
):
    try:
        student = get_authenticated_student(authorization)

        result = (
            supabase
            .table("complaints")
            .select(
                "id,complaint_number,title,category,"
                "priority,status,assigned_department_id,"
                "submitted_at,resolved_at"
            )
            .eq("student_id", student["id"])
            .order("submitted_at", desc=True)
            .execute()
        )

        complaints = []

        for complaint in result.data or []:
            assigned_department_name = None

            department_id = complaint.get("assigned_department_id")

            if department_id:
                department_result = (
                    supabase
                    .table("departments")
                    .select("name")
                    .eq("id", department_id)
                    .limit(1)
                    .execute()
                )

                if department_result.data:
                    assigned_department_name = (
                        department_result.data[0]["name"]
                    )

            complaints.append({
                "id": complaint["id"],
                "complaint_number": complaint["complaint_number"],
                "title": complaint["title"],
                "category": complaint["category"],
                "priority": complaint["priority"],
                "status": complaint["status"],
                "assigned_department": assigned_department_name,
                "submitted_at": complaint["submitted_at"],
                "resolved_at": complaint["resolved_at"],
            })

        return {
            "success": True,
            "count": len(complaints),
            "complaints": complaints,
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to load student complaints: {str(error)}"
        )

# =====================================================
# STUDENT NOTIFICATIONS
# =====================================================

@app.get("/my-notifications")
def get_my_notifications(
    authorization: str | None = Header(default=None),
):
    try:
        student = get_authenticated_student(authorization)

        result = (
            supabase
            .table("notifications")
            .select(
                "id,complaint_id,title,message,"
                "notification_type,is_read,created_at"
            )
            .eq("user_id", student["id"])
            .order("created_at", desc=True)
            .execute()
        )

        notifications = result.data or []
        unread_count = sum(
            1 for item in notifications
            if not item.get("is_read")
        )

        return {
            "success": True,
            "count": len(notifications),
            "unread_count": unread_count,
            "notifications": notifications,
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to load notifications: {str(error)}"
        )


@app.patch("/notifications/{notification_id}/read")
def mark_notification_as_read(
    notification_id: str,
    authorization: str | None = Header(default=None),
):
    try:
        student = get_authenticated_student(authorization)

        notification_result = (
            supabase
            .table("notifications")
            .select("id,user_id,is_read")
            .eq("id", notification_id)
            .eq("user_id", student["id"])
            .limit(1)
            .execute()
        )

        if not notification_result.data:
            raise HTTPException(
                status_code=404,
                detail="Notification not found."
            )

        if notification_result.data[0].get("is_read"):
            return {
                "success": True,
                "message": "Notification is already read.",
            }

        update_result = (
            supabase
            .table("notifications")
            .update({"is_read": True})
            .eq("id", notification_id)
            .eq("user_id", student["id"])
            .execute()
        )

        if not update_result.data:
            raise HTTPException(
                status_code=500,
                detail="Notification could not be updated."
            )

        return {
            "success": True,
            "message": "Notification marked as read.",
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to update notification: {str(error)}"
        )


@app.patch("/notifications/read-all")
def mark_all_notifications_as_read(
    authorization: str | None = Header(default=None),
):
    try:
        student = get_authenticated_student(authorization)

        result = (
            supabase
            .table("notifications")
            .update({"is_read": True})
            .eq("user_id", student["id"])
            .eq("is_read", False)
            .execute()
        )

        return {
            "success": True,
            "message": "All notifications marked as read.",
            "updated_count": len(result.data or []),
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to update notifications: {str(error)}"
        )


@app.get("/department-complaints")
def get_department_complaints(
    authorization: str | None = Header(default=None),
):
    try:
        officer = get_authenticated_department_officer(
            authorization
        )

        result = (
            supabase
            .table("complaints")
            .select(
                "id,complaint_number,student_name,roll_number,"
                "category,title,description,priority,status,"
                "confidential,submitted_at,resolved_at,"
                "ai_analyzed,ai_summary,ai_category,ai_priority,"
                "ai_urgency,ai_confidence,ai_reason,"
                "ai_recommended_department_id,ai_sla_hours,"
                "ai_analyzed_at"
            )
            .eq(
                "assigned_department_id",
                officer["department_id"]
            )
            .order("submitted_at", desc=True)
            .execute()
        )

        return {
            "success": True,
            "officer": {
                "full_name": officer["full_name"],
                "email": officer["email"],
                "department_id": officer["department_id"],
            },
            "count": len(result.data or []),
            "complaints": result.data or [],
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to load department complaints: {str(error)}"
        )

@app.patch("/department-complaints/{complaint_number}/status")
def update_department_complaint_status(
    complaint_number: str,
    payload: OfficerComplaintStatusUpdate,
    authorization: str | None = Header(default=None),
):
    try:
        # 1. Verify department officer
        officer = get_authenticated_department_officer(
            authorization
        )

        clean_number = complaint_number.strip().upper()

        # 2. Find complaint only inside officer's department
        complaint_result = (
            supabase
            .table("complaints")
            .select(
                "id,complaint_number,status,"
                "assigned_department_id,student_id"
            )
            .eq("complaint_number", clean_number)
            .eq(
                "assigned_department_id",
                officer["department_id"]
            )
            .limit(1)
            .execute()
        )

        if not complaint_result.data:
            raise HTTPException(
                status_code=404,
                detail="Complaint not found in your department."
            )

        complaint = complaint_result.data[0]

        old_status = complaint["status"]
        new_status = payload.status.strip().lower()

        # 3. Professional status workflow
        allowed_transitions = {
            "submitted": ["verified"],
            "verified": ["in_progress"],
            "assigned": ["in_progress"],
            "in_progress": ["resolved"],
        }

        allowed_next = allowed_transitions.get(
            old_status,
            []
        )

        if new_status not in allowed_next:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Invalid status transition from "
                    f"'{old_status}' to '{new_status}'."
                )
            )

        # 4. Build update data
        update_data = {
            "status": new_status,
            "assigned_officer_id": officer["id"],
        }

        if new_status == "resolved":
            update_data["resolved_at"] = (
                datetime.now(timezone.utc).isoformat()
            )

        # 5. Update complaint
        update_result = (
            supabase
            .table("complaints")
            .update(update_data)
            .eq("id", complaint["id"])
            .execute()
        )

        if not update_result.data:
            raise HTTPException(
                status_code=500,
                detail="Complaint status could not be updated."
            )

        # 6. Add timeline/history entry
        supabase.table(
            "complaint_status_history"
        ).insert({
            "complaint_id": complaint["id"],
            "old_status": old_status,
            "new_status": new_status,
            "remarks": (
                payload.remarks.strip()
                if payload.remarks
                else f"Status updated to {new_status} by department officer."
            ),
            "changed_by": officer["id"],
        }).execute()

        # 7. Create student portal notification
        notification_messages = {
            "verified": (
                "Your complaint has been verified by the assigned department."
            ),
            "in_progress": (
                "Your complaint is now being worked on by the assigned department."
            ),
            "resolved": (
                "Your complaint has been marked as resolved."
            ),
        }

        supabase.table("notifications").insert({
            "user_id": complaint["student_id"],
            "complaint_id": complaint["id"],
            "title": (
                f"Complaint {clean_number} - "
                f"{new_status.replace('_', ' ').title()}"
            ),
            "message": notification_messages.get(
                new_status,
                f"Your complaint status changed to {new_status}."
            ),
            "notification_type": "portal",
            "is_read": False,
        }).execute()

        return {
            "success": True,
            "message": "Complaint status updated successfully.",
            "complaint_number": clean_number,
            "old_status": old_status,
            "new_status": new_status,
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to update complaint status: {str(error)}"
        )

class AdminRoutingRuleUpdate(BaseModel):
    routing_mode: str
    target_department_id: str | None = None
    default_priority: str
    sla_hours: int
    is_active: bool

@app.get("/department-complaints/{complaint_number}/evidence")
def get_department_complaint_evidence(
    complaint_number: str,
    authorization: str | None = Header(default=None),
):
    try:
        # 1. Verify department officer
        officer = get_authenticated_department_officer(
            authorization
        )

        clean_number = complaint_number.strip().upper()

        # 2. Officer can only access complaint
        # assigned to their own department
        complaint_result = (
            supabase
            .table("complaints")
            .select("id,complaint_number")
            .eq("complaint_number", clean_number)
            .eq(
                "assigned_department_id",
                officer["department_id"]
            )
            .limit(1)
            .execute()
        )

        if not complaint_result.data:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Complaint not found in your department "
                    "or access denied."
                )
            )

        complaint = complaint_result.data[0]

        # 3. Load complaint attachments
        attachment_result = (
            supabase
            .table("attachments")
            .select(
                "id,file_name,file_path,file_type,"
                "file_size,created_at"
            )
            .eq("complaint_id", complaint["id"])
            .order("created_at")
            .execute()
        )

        evidence_files = []

        # 4. Generate temporary secure URLs
        for attachment in attachment_result.data or []:
            signed_result = (
                supabase.storage
                .from_(SUPABASE_EVIDENCE_BUCKET)
                .create_signed_url(
                    attachment["file_path"],
                    3600
                )
            )

            signed_url = (
                signed_result.get("signedURL")
                or signed_result.get("signedUrl")
            )

            evidence_files.append({
                "id": attachment["id"],
                "file_name": attachment["file_name"],
                "file_type": attachment["file_type"],
                "file_size": attachment["file_size"],
                "created_at": attachment["created_at"],
                "signed_url": signed_url,
            })

        return {
            "success": True,
            "complaint_number": clean_number,
            "count": len(evidence_files),
            "evidence": evidence_files,
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to load department evidence: {str(error)}"
        )

@app.get("/admin/dashboard")
def get_admin_dashboard(
    authorization: str | None = Header(default=None),
):
    try:
        # 1. Verify Admin / Super Admin
        admin = get_authenticated_admin(authorization)

        # 2. Get all complaints
        complaint_result = (
            supabase
            .table("complaints")
            .select(
                "id,complaint_number,student_name,roll_number,"
                "category,title,priority,status,"
                "assigned_department_id,confidential,"
                "submitted_at,resolved_at,"
                "sla_hours,sla_deadline,"
                "escalation_level,escalated_at"
            )
            .order("submitted_at", desc=True)
            .execute()
        )

        raw_complaints = complaint_result.data or []

        # 3. Dashboard statistics
        total = len(raw_complaints)

        submitted = len([
            item for item in raw_complaints
            if item["status"] == "submitted"
        ])

        in_progress = len([
            item for item in raw_complaints
            if item["status"] in [
                "verified",
                "assigned",
                "in_progress",
            ]
        ])

        resolved = len([
            item for item in raw_complaints
            if item["status"] == "resolved"
        ])

        escalated = len([
            item for item in raw_complaints
            if item["status"] == "escalated"
        ])

        high_critical = len([
            item for item in raw_complaints
            if item["priority"] in ["high", "critical"]
        ])

        # 4. Escalation level names
        escalation_names = {
            0: "Normal Department Handling",
            1: "Department Escalation",
            2: "Admin Escalation",
            3: "Higher Administration",
            4: "Vice Chancellor Secretariat",
        }

        # 5. Add department + escalation information
        complaints = []

        for complaint in raw_complaints:
            department_name = None

            department_id = complaint.get(
                "assigned_department_id"
            )

            if department_id:
                department_result = (
                    supabase
                    .table("departments")
                    .select("name")
                    .eq("id", department_id)
                    .limit(1)
                    .execute()
                )

                if department_result.data:
                    department_name = (
                        department_result.data[0]["name"]
                    )

            escalation_level = (
                complaint.get("escalation_level") or 0
            )

            escalation_name = escalation_names.get(
                escalation_level,
                "Unknown"
            )

            complaints.append({
                "id": complaint["id"],
                "complaint_number": complaint["complaint_number"],
                "student_name": complaint["student_name"],
                "roll_number": complaint["roll_number"],
                "category": complaint["category"],
                "title": complaint["title"],
                "priority": complaint["priority"],
                "status": complaint["status"],
                "assigned_department": department_name,
                "confidential": complaint["confidential"],

                "sla_hours": complaint.get("sla_hours"),
                "sla_deadline": complaint.get("sla_deadline"),

                "escalation_level": escalation_level,
                "escalation_name": escalation_name,
                "escalated_at": complaint.get("escalated_at"),

                "submitted_at": complaint["submitted_at"],
                "resolved_at": complaint["resolved_at"],
            })

        # 6. Return dashboard
        return {
            "success": True,

            "admin": {
                "id": admin["id"],
                "full_name": admin["full_name"],
                "email": admin["email"],
                "role": admin["role"],
            },

            "stats": {
                "total": total,
                "submitted": submitted,
                "in_progress": in_progress,
                "resolved": resolved,
                "escalated": escalated,
                "high_critical": high_critical,
            },

            "complaints": complaints,
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to load admin dashboard: {str(error)}"
        )

@app.get("/admin/complaints/{complaint_number}")
def get_admin_complaint_detail(
    complaint_number: str,
    authorization: str | None = Header(default=None),
):
    try:
        # 1. Verify Admin
        get_authenticated_admin(authorization)

        clean_number = complaint_number.strip().upper()

        # 2. Get complaint
        complaint_result = (
            supabase
            .table("complaints")
            .select(
                "id,complaint_number,student_name,roll_number,"
                "email,phone,student_department_id,semester,"
                "category,title,description,priority,status,"
                "assigned_department_id,confidential,"
                "submitted_at,resolved_at,"
                "ai_analyzed,ai_summary,ai_category,ai_priority,"
                "ai_urgency,ai_confidence,ai_reason,"
                "ai_recommended_department_id,ai_sla_hours,"
                "ai_analyzed_at"
            )
            .eq("complaint_number", clean_number)
            .limit(1)
            .execute()
        )

        if not complaint_result.data:
            raise HTTPException(
                status_code=404,
                detail="Complaint not found."
            )

        complaint = complaint_result.data[0]

        # 3. Student department name
        student_department_name = None

        if complaint.get("student_department_id"):
            result = (
                supabase
                .table("departments")
                .select("name")
                .eq(
                    "id",
                    complaint["student_department_id"]
                )
                .limit(1)
                .execute()
            )

            if result.data:
                student_department_name = result.data[0]["name"]

        # 4. Assigned department name
        assigned_department_name = None

        if complaint.get("assigned_department_id"):
            result = (
                supabase
                .table("departments")
                .select("name")
                .eq(
                    "id",
                    complaint["assigned_department_id"]
                )
                .limit(1)
                .execute()
            )

            if result.data:
                assigned_department_name = result.data[0]["name"]

        # 5. Timeline
        history_result = (
            supabase
            .table("complaint_status_history")
            .select(
                "id,old_status,new_status,"
                "remarks,changed_by,created_at"
            )
            .eq("complaint_id", complaint["id"])
            .order("created_at")
            .execute()
        )

        # 6. Evidence
        attachment_result = (
            supabase
            .table("attachments")
            .select(
                "id,file_name,file_path,"
                "file_type,file_size,created_at"
            )
            .eq("complaint_id", complaint["id"])
            .order("created_at")
            .execute()
        )

        evidence_files = []

        for attachment in attachment_result.data or []:
            signed_result = (
                supabase.storage
                .from_(SUPABASE_EVIDENCE_BUCKET)
                .create_signed_url(
                    attachment["file_path"],
                    3600
                )
            )

            signed_url = (
                signed_result.get("signedURL")
                or signed_result.get("signedUrl")
            )

            evidence_files.append({
                "id": attachment["id"],
                "file_name": attachment["file_name"],
                "file_type": attachment["file_type"],
                "file_size": attachment["file_size"],
                "created_at": attachment["created_at"],
                "signed_url": signed_url,
            })

        return {
            "success": True,
            "complaint": {
                **complaint,
                "student_department": student_department_name,
                "assigned_department": assigned_department_name,
            },
            "history": history_result.data or [],
            "evidence": evidence_files,
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to load admin complaint: {str(error)}"
        )
@app.get("/admin/routing-rules")
def get_admin_routing_rules(
    authorization: str | None = Header(default=None),
):
    try:
        # 1. Verify Admin
        get_authenticated_admin(authorization)

        # 2. Load routing rules
        result = (
            supabase
            .table("complaint_routing_rules")
            .select(
                "id,category,routing_mode,target_department_id,"
                "default_priority,sla_hours,is_active"
            )
            .order("category")
            .execute()
        )

        rules = []

        for rule in result.data or []:
            department_name = None

            if rule.get("target_department_id"):
                department_result = (
                    supabase
                    .table("departments")
                    .select("name")
                    .eq(
                        "id",
                        rule["target_department_id"]
                    )
                    .limit(1)
                    .execute()
                )

                if department_result.data:
                    department_name = (
                        department_result.data[0]["name"]
                    )

            rules.append({
                "id": rule["id"],
                "category": rule["category"],
                "routing_mode": rule["routing_mode"],
                "target_department_id": rule[
                    "target_department_id"
                ],
                "target_department": department_name,
                "default_priority": rule[
                    "default_priority"
                ],
                "sla_hours": rule["sla_hours"],
                "is_active": rule["is_active"],
            })

        return {
            "success": True,
            "count": len(rules),
            "rules": rules,
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to load routing rules: {str(error)}"
        )

@app.patch("/admin/routing-rules/{rule_id}")
def update_admin_routing_rule(
    rule_id: str,
    payload: AdminRoutingRuleUpdate,
    authorization: str | None = Header(default=None),
):
    try:
        # 1. Verify Admin
        get_authenticated_admin(authorization)

        routing_mode = payload.routing_mode.strip().lower()
        priority = payload.default_priority.strip().lower()

        # 2. Validate routing mode
        if routing_mode not in [
            "fixed",
            "student_department",
        ]:
            raise HTTPException(
                status_code=400,
                detail="Invalid routing mode."
            )

        # 3. Validate priority
        if priority not in [
            "low",
            "medium",
            "high",
            "critical",
        ]:
            raise HTTPException(
                status_code=400,
                detail="Invalid priority."
            )

        # 4. Validate SLA
        if payload.sla_hours < 1:
            raise HTTPException(
                status_code=400,
                detail="SLA hours must be greater than 0."
            )

        # 5. Check routing rule exists
        rule_result = (
            supabase
            .table("complaint_routing_rules")
            .select("id,category")
            .eq("id", rule_id)
            .limit(1)
            .execute()
        )

        if not rule_result.data:
            raise HTTPException(
                status_code=404,
                detail="Routing rule not found."
            )

        # 6. Handle department
        target_department_id = None

        if routing_mode == "fixed":
            if not payload.target_department_id:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Target department is required "
                        "for fixed routing."
                    )
                )

            department_result = (
                supabase
                .table("departments")
                .select("id,name,is_active")
                .eq(
                    "id",
                    payload.target_department_id
                )
                .limit(1)
                .execute()
            )

            if not department_result.data:
                raise HTTPException(
                    status_code=404,
                    detail="Target department not found."
                )

            if not department_result.data[0]["is_active"]:
                raise HTTPException(
                    status_code=400,
                    detail="Target department is inactive."
                )

            target_department_id = (
                payload.target_department_id
            )

        # 7. Update routing rule
        update_result = (
            supabase
            .table("complaint_routing_rules")
            .update({
                "routing_mode": routing_mode,
                "target_department_id":
                    target_department_id,
                "default_priority": priority,
                "sla_hours": payload.sla_hours,
                "is_active": payload.is_active,
            })
            .eq("id", rule_id)
            .execute()
        )

        if not update_result.data:
            raise HTTPException(
                status_code=500,
                detail="Routing rule could not be updated."
            )

        updated_rule = update_result.data[0]

        # 8. Get department name
        department_name = None

        if target_department_id:
            department_result = (
                supabase
                .table("departments")
                .select("name")
                .eq("id", target_department_id)
                .limit(1)
                .execute()
            )

            if department_result.data:
                department_name = (
                    department_result.data[0]["name"]
                )

        return {
            "success": True,
            "message": "Routing rule updated successfully.",
            "rule": {
                "id": updated_rule["id"],
                "category": updated_rule["category"],
                "routing_mode":
                    updated_rule["routing_mode"],
                "target_department_id":
                    updated_rule["target_department_id"],
                "target_department":
                    department_name,
                "default_priority":
                    updated_rule["default_priority"],
                "sla_hours":
                    updated_rule["sla_hours"],
                "is_active":
                    updated_rule["is_active"],
            },
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to update routing rule: {str(error)}"
        )

# =====================================================
# SLA ESCALATION CORE
# =====================================================

def run_sla_escalation_check():
    now = datetime.now(timezone.utc)

    complaint_result = (
        supabase
        .table("complaints")
        .select(
            "id,complaint_number,student_id,status,"
            "sla_deadline,escalation_level,escalated_at"
        )
        .in_(
            "status",
            [
                "submitted",
                "verified",
                "assigned",
                "in_progress",
                "escalated",
            ]
        )
        .execute()
    )

    complaints = complaint_result.data or []

    escalated_complaints = []

    escalation_names = {
        1: "Department Escalation",
        2: "Admin Escalation",
        3: "Higher Administration",
        4: "Vice Chancellor Secretariat",
    }

    for complaint in complaints:
        current_level = (
            complaint.get("escalation_level") or 0
        )

        if current_level >= 4:
            continue

        should_escalate = False

        # Level 0 -> Level 1
        if current_level == 0:
            sla_deadline = complaint.get("sla_deadline")

            if not sla_deadline:
                continue

            deadline = datetime.fromisoformat(
                sla_deadline.replace("Z", "+00:00")
            )

            if deadline <= now:
                should_escalate = True

        # Level 1 -> 2 -> 3 -> 4
        else:
            escalated_at = complaint.get("escalated_at")

            if not escalated_at:
                continue

            previous_escalation_time = (
                datetime.fromisoformat(
                    escalated_at.replace(
                        "Z",
                        "+00:00"
                    )
                )
            )

            next_escalation_time = (
                previous_escalation_time
                + timedelta(hours=24)
            )

            if next_escalation_time <= now:
                should_escalate = True

        if not should_escalate:
            continue

        new_level = current_level + 1

        escalation_name = escalation_names[
            new_level
        ]

        old_status = complaint["status"]

        # Update main complaint
        update_result = (
            supabase
            .table("complaints")
            .update({
                "status": "escalated",
                "escalation_level": new_level,
                "escalated_at": now.isoformat(),
            })
            .eq("id", complaint["id"])
            .execute()
        )

        if not update_result.data:
            continue

        # Permanent escalation audit record
        supabase.table(
            "escalations"
        ).insert({
            "complaint_id": complaint["id"],
            "escalation_level": new_level,
            "escalated_to": escalation_name,
            "reason": (
                "Complaint remained unresolved "
                "beyond its allowed SLA/escalation period."
            ),
            "status": "active",
            "escalated_at": now.isoformat(),
            "resolved_at": None,
        }).execute()

        # Complaint timeline
        supabase.table(
            "complaint_status_history"
        ).insert({
            "complaint_id": complaint["id"],
            "old_status": old_status,
            "new_status": "escalated",
            "remarks": (
                f"Complaint automatically escalated "
                f"to Level {new_level} - "
                f"{escalation_name}."
            ),
        }).execute()

        # Student notification
        if complaint.get("student_id"):
            supabase.table(
                "notifications"
            ).insert({
                "user_id": complaint["student_id"],
                "complaint_id": complaint["id"],
                "title": (
                    f"Complaint "
                    f"{complaint['complaint_number']} "
                    f"- Escalation Level {new_level}"
                ),
                "message": (
                    f"Your complaint has been "
                    f"escalated to {escalation_name} "
                    f"because it is still unresolved."
                ),
                "notification_type": "portal",
                "is_read": False,
            }).execute()

        escalated_complaints.append({
            "complaint_number":
                complaint["complaint_number"],
            "previous_level":
                current_level,
            "new_level":
                new_level,
            "escalated_to":
                escalation_name,
        })

    return {
        "success": True,
        "checked_at": now.isoformat(),
        "escalated_count":
            len(escalated_complaints),
        "escalated_complaints":
            escalated_complaints,
    }


# =====================================================
# ADMIN MANUAL SLA CHECK
# =====================================================

@app.post("/admin/check-sla-escalations")
def check_sla_escalations(
    authorization: str | None = Header(default=None),
):
    try:
        get_authenticated_admin(authorization)

        return run_sla_escalation_check()

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=(
                f"Unable to check SLA escalations: "
                f"{str(error)}"
            )
        )


# =====================================================
# N8N AUTOMATIC SLA CHECK
# =====================================================

@app.post("/automation/check-sla-escalations")
def automation_check_sla_escalations(
    x_automation_secret: str | None = Header(
        default=None,
        alias="X-Automation-Secret",
    ),
):
    try:
        # Verify automation secret
        if (
            not x_automation_secret
            or x_automation_secret != AUTOMATION_SECRET
        ):
            raise HTTPException(
                status_code=401,
                detail="Invalid automation secret."
            )

        return run_sla_escalation_check()

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=(
                f"Automation SLA check failed: "
                f"{str(error)}"
            )
        )

# =====================================================
# ADMIN - ESCALATION AUDIT HISTORY
# =====================================================

@app.get("/admin/escalations")
def get_admin_escalations(
    authorization: str | None = Header(default=None),
):
    try:
        # 1. Verify Admin
        get_authenticated_admin(authorization)

        # 2. Get escalation records
        escalation_result = (
            supabase
            .table("escalations")
            .select(
                "id,complaint_id,escalation_level,"
                "escalated_to,reason,status,"
                "escalated_at,resolved_at"
            )
            .order("escalated_at", desc=True)
            .execute()
        )

        raw_escalations = escalation_result.data or []

        escalation_history = []

        # 3. Attach complaint number/title
        for escalation in raw_escalations:
            complaint_result = (
                supabase
                .table("complaints")
                .select(
                    "complaint_number,title,category,"
                    "priority,status"
                )
                .eq(
                    "id",
                    escalation["complaint_id"]
                )
                .limit(1)
                .execute()
            )

            complaint = (
                complaint_result.data[0]
                if complaint_result.data
                else {}
            )

            escalation_history.append({
                "id": escalation["id"],
                "complaint_id": escalation["complaint_id"],
                "complaint_number": complaint.get(
                    "complaint_number"
                ),
                "title": complaint.get("title"),
                "category": complaint.get("category"),
                "priority": complaint.get("priority"),
                "complaint_status": complaint.get("status"),
                "escalation_level": escalation[
                    "escalation_level"
                ],
                "escalated_to": escalation["escalated_to"],
                "reason": escalation["reason"],
                "status": escalation["status"],
                "escalated_at": escalation["escalated_at"],
                "resolved_at": escalation["resolved_at"],
            })

        return {
            "success": True,
            "total": len(escalation_history),
            "escalations": escalation_history,
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=(
                f"Unable to load escalation history: "
                f"{str(error)}"
            )
        )

# =====================================================
# ADMIN - ESCALATION ACTIONS
# =====================================================

class AdminEscalationAction(BaseModel):
    remarks: str | None = None


@app.patch("/admin/escalations/{escalation_id}/acknowledge")
def acknowledge_escalation(
    escalation_id: str,
    payload: AdminEscalationAction,
    authorization: str | None = Header(default=None),
):
    try:
        # 1. Verify Admin
        admin = get_authenticated_admin(authorization)

        # 2. Find escalation
        escalation_result = (
            supabase
            .table("escalations")
            .select(
                "id,complaint_id,escalation_level,"
                "escalated_to,status"
            )
            .eq("id", escalation_id)
            .limit(1)
            .execute()
        )

        if not escalation_result.data:
            raise HTTPException(
                status_code=404,
                detail="Escalation record not found."
            )

        escalation = escalation_result.data[0]

        if escalation["status"] == "resolved":
            raise HTTPException(
                status_code=400,
                detail="Resolved escalation cannot be acknowledged."
            )

        # 3. Update escalation
        update_result = (
            supabase
            .table("escalations")
            .update({
                "status": "acknowledged",
            })
            .eq("id", escalation_id)
            .execute()
        )

        if not update_result.data:
            raise HTTPException(
                status_code=500,
                detail="Escalation could not be acknowledged."
            )

        # 4. Timeline record
        supabase.table(
            "complaint_status_history"
        ).insert({
            "complaint_id": escalation["complaint_id"],
            "old_status": "escalated",
            "new_status": "escalated",
            "remarks": (
                payload.remarks.strip()
                if payload.remarks
                else (
                    f"Escalation Level "
                    f"{escalation['escalation_level']} "
                    f"acknowledged by administration."
                )
            ),
            "changed_by": admin["id"],
        }).execute()

        return {
            "success": True,
            "message": "Escalation acknowledged successfully.",
            "escalation": update_result.data[0],
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=(
                f"Unable to acknowledge escalation: "
                f"{str(error)}"
            )
        )


@app.patch("/admin/escalations/{escalation_id}/resolve")
def resolve_escalation(
    escalation_id: str,
    payload: AdminEscalationAction,
    authorization: str | None = Header(default=None),
):
    try:
        # 1. Verify Admin
        admin = get_authenticated_admin(authorization)

        now = datetime.now(timezone.utc)

        # 2. Find escalation
        escalation_result = (
            supabase
            .table("escalations")
            .select(
                "id,complaint_id,escalation_level,"
                "escalated_to,status"
            )
            .eq("id", escalation_id)
            .limit(1)
            .execute()
        )

        if not escalation_result.data:
            raise HTTPException(
                status_code=404,
                detail="Escalation record not found."
            )

        escalation = escalation_result.data[0]

        if escalation["status"] == "resolved":
            raise HTTPException(
                status_code=400,
                detail="Escalation is already resolved."
            )

        # 3. Get complaint
        complaint_result = (
            supabase
            .table("complaints")
            .select(
                "id,complaint_number,student_id,status"
            )
            .eq("id", escalation["complaint_id"])
            .limit(1)
            .execute()
        )

        if not complaint_result.data:
            raise HTTPException(
                status_code=404,
                detail="Complaint not found."
            )

        complaint = complaint_result.data[0]

        old_status = complaint["status"]

        # 4. Mark complaint resolved
        complaint_update = (
            supabase
            .table("complaints")
            .update({
                "status": "resolved",
                "resolved_at": now.isoformat(),
            })
            .eq("id", complaint["id"])
            .execute()
        )

        if not complaint_update.data:
            raise HTTPException(
                status_code=500,
                detail="Complaint could not be resolved."
            )

        # 5. Close all escalation records for complaint
        supabase.table(
            "escalations"
        ).update({
            "status": "resolved",
            "resolved_at": now.isoformat(),
        }).eq(
            "complaint_id",
            complaint["id"]
        ).in_(
            "status",
            ["active", "acknowledged"]
        ).execute()

        # 6. Complaint timeline
        supabase.table(
            "complaint_status_history"
        ).insert({
            "complaint_id": complaint["id"],
            "old_status": old_status,
            "new_status": "resolved",
            "remarks": (
                payload.remarks.strip()
                if payload.remarks
                else (
                    "Escalated complaint resolved "
                    "by administration."
                )
            ),
            "changed_by": admin["id"],
        }).execute()

        # 7. Notify student
        if complaint.get("student_id"):
            supabase.table(
                "notifications"
            ).insert({
                "user_id": complaint["student_id"],
                "complaint_id": complaint["id"],
                "title": (
                    f"Complaint "
                    f"{complaint['complaint_number']} "
                    f"- Resolved"
                ),
                "message": (
                    "Your escalated complaint has been "
                    "resolved by the administration."
                ),
                "notification_type": "portal",
                "is_read": False,
            }).execute()

        return {
            "success": True,
            "message": (
                "Escalated complaint resolved successfully."
            ),
            "complaint_number":
                complaint["complaint_number"],
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=(
                f"Unable to resolve escalation: "
                f"{str(error)}"
            )
        )

# =====================================================
# N8N - ADMIN ESCALATION ALERT
# =====================================================

class AutomationAdminAlert(BaseModel):
    complaint_number: str
    escalation_level: int
    escalated_to: str
    message: str


@app.post("/automation/admin-alert")
def automation_admin_alert(
    payload: AutomationAdminAlert,
    x_automation_secret: str | None = Header(
        default=None,
        alias="X-Automation-Secret",
    ),
):
    try:
        # 1. Verify automation secret
        if (
            not x_automation_secret
            or x_automation_secret != AUTOMATION_SECRET
        ):
            raise HTTPException(
                status_code=401,
                detail="Invalid automation secret."
            )

        # 2. Find complaint
        complaint_result = (
            supabase
            .table("complaints")
            .select("id,complaint_number")
            .eq(
                "complaint_number",
                payload.complaint_number.strip().upper()
            )
            .limit(1)
            .execute()
        )

        if not complaint_result.data:
            raise HTTPException(
                status_code=404,
                detail="Complaint not found."
            )

        complaint = complaint_result.data[0]

        # 3. Get active admins
        admin_result = (
            supabase
            .table("profiles")
            .select("id,full_name,email,role")
            .in_("role", ["admin", "super_admin"])
            .eq("is_active", True)
            .execute()
        )

        admins = admin_result.data or []

        created_notifications = 0

        # 4. Create notification for each admin
        for admin in admins:
            supabase.table(
                "notifications"
            ).insert({
                "user_id": admin["id"],
                "complaint_id": complaint["id"],
                "title": (
                    f"SLA Escalation - "
                    f"{payload.complaint_number}"
                ),
                "message": (
                    f"{payload.message} "
                    f"Level {payload.escalation_level} - "
                    f"{payload.escalated_to}."
                ),
                "notification_type": "portal",
                "is_read": False,
            }).execute()

            created_notifications += 1

        return {
            "success": True,
            "message": "Admin escalation alert created.",
            "notifications_created":
                created_notifications,
            "complaint_number":
                payload.complaint_number,
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=(
                f"Unable to create admin alert: "
                f"{str(error)}"
            )
        )

# =====================================================
# ADMIN NOTIFICATIONS
# =====================================================

@app.get("/admin/notifications")
def get_admin_notifications(
    authorization: str | None = Header(default=None),
):
    try:
        admin = get_authenticated_admin(authorization)

        result = (
            supabase
            .table("notifications")
            .select(
                "id,complaint_id,title,message,"
                "notification_type,is_read,created_at"
            )
            .eq("user_id", admin["id"])
            .order("created_at", desc=True)
            .limit(50)
            .execute()
        )

        notifications = result.data or []

        unread_count = len([
            item for item in notifications
            if not item["is_read"]
        ])

        return {
            "success": True,
            "unread_count": unread_count,
            "notifications": notifications,
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to load admin notifications: {str(error)}"
        )


@app.patch("/admin/notifications/{notification_id}/read")
def mark_admin_notification_read(
    notification_id: str,
    authorization: str | None = Header(default=None),
):
    try:
        admin = get_authenticated_admin(authorization)

        result = (
            supabase
            .table("notifications")
            .update({
                "is_read": True,
            })
            .eq("id", notification_id)
            .eq("user_id", admin["id"])
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=404,
                detail="Notification not found."
            )

        return {
            "success": True,
            "message": "Notification marked as read.",
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to update notification: {str(error)}"
        )


@app.patch("/admin/notifications/read-all")
def mark_all_admin_notifications_read(
    authorization: str | None = Header(default=None),
):
    try:
        admin = get_authenticated_admin(authorization)

        supabase.table(
            "notifications"
        ).update({
            "is_read": True,
        }).eq(
            "user_id",
            admin["id"]
        ).eq(
            "is_read",
            False
        ).execute()

        return {
            "success": True,
            "message": "All admin notifications marked as read.",
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to update notifications: {str(error)}"
        )

# =====================================================
# AI COMPLAINT ANALYSIS
# =====================================================

class AIComplaintAnalyzeRequest(BaseModel):
    title: str
    description: str


@app.post("/ai/analyze-complaint")
def analyze_complaint_with_ai(
    payload: AIComplaintAnalyzeRequest,
    authorization: str | None = Header(default=None),
):
    try:
        # 1. Verify logged-in student
        student = get_authenticated_student(authorization)

        title = payload.title.strip()
        description = payload.description.strip()

        if not title:
            raise HTTPException(
                status_code=400,
                detail="Complaint title is required."
            )

        if len(description) < 10:
            raise HTTPException(
                status_code=400,
                detail="Complaint description is too short."
            )

        allowed_categories = [
            "Academics",
            "Administration",
            "Examination",
            "Hostel",
            "IT Support",
            "Library",
            "Maintenance",
            "Other",
            "Transport",
        ]

        prompt = f"""
You are an AI assistant for the QUEST University Complaint Portal.

Analyze the student's complaint.

Complaint Title:
{title}

Complaint Description:
{description}

Choose EXACTLY ONE category from:
{", ".join(allowed_categories)}

Choose priority from:
low, medium, high, critical

Choose urgency from:
normal, urgent, emergency

Return ONLY valid JSON with this exact structure:

{{
  "summary": "short professional complaint summary",
  "category": "one allowed category",
  "priority": "low|medium|high|critical",
  "urgency": "normal|urgent|emergency",
  "confidence": 0.0,
  "reason": "short explanation"
}}

Rules:
- Do not invent facts.
- confidence must be between 0 and 1.
- Keep summary concise.
- Use critical only for genuinely severe or safety-sensitive cases.
"""

        # 2. Gemini analysis
        response = gemini_client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
            },
        )

        if not response.text:
            raise HTTPException(
                status_code=500,
                detail="AI returned an empty response."
            )

        try:
            ai_result = json.loads(response.text)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=500,
                detail="AI returned invalid JSON."
            )

        # 3. Validate AI category
        category = ai_result.get("category")

        if category not in allowed_categories:
            category = "Other"

        priority = ai_result.get(
            "priority",
            "medium"
        ).lower()

        if priority not in [
            "low",
            "medium",
            "high",
            "critical",
        ]:
            priority = "medium"

        urgency = ai_result.get(
            "urgency",
            "normal"
        ).lower()

        if urgency not in [
            "normal",
            "urgent",
            "emergency",
        ]:
            urgency = "normal"

        # 4. Find routing rule
        routing_result = (
            supabase
            .table("complaint_routing_rules")
            .select(
                "routing_mode,target_department_id,"
                "default_priority,sla_hours"
            )
            .eq("category", category)
            .eq("is_active", True)
            .limit(1)
            .execute()
        )

        recommended_department = None
        recommended_department_id = None
        sla_hours = None

        if routing_result.data:
            routing_rule = routing_result.data[0]

            sla_hours = routing_rule.get("sla_hours")

            if routing_rule["routing_mode"] == "fixed":
                recommended_department_id = (
                    routing_rule.get(
                        "target_department_id"
                    )
                )

            elif (
                routing_rule["routing_mode"]
                == "student_department"
            ):
                recommended_department_id = (
                    student.get("department_id")
                )

        # 5. Resolve department name
        if recommended_department_id:
            department_result = (
                supabase
                .table("departments")
                .select("name")
                .eq(
                    "id",
                    recommended_department_id
                )
                .limit(1)
                .execute()
            )

            if department_result.data:
                recommended_department = (
                    department_result.data[0]["name"]
                )

        # 6. Return AI analysis
        return {
            "success": True,
            "analysis": {
                "summary": ai_result.get(
                    "summary",
                    title
                ),
                "category": category,
                "priority": priority,
                "urgency": urgency,
                "confidence": ai_result.get(
                    "confidence",
                    0
                ),
                "reason": ai_result.get(
                    "reason",
                    ""
                ),
                "recommended_department":
                    recommended_department,
                "recommended_department_id":
                    recommended_department_id,
                "sla_hours": sla_hours,
            },
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=(
                f"Unable to analyze complaint with AI: "
                f"{str(error)}"
            )
        )

# =====================================================
# ADMIN ANALYTICS
# =====================================================

@app.get("/admin/analytics")
def get_admin_analytics(
    authorization: str | None = Header(default=None),
):
    try:
        get_authenticated_admin(authorization)

        complaint_result = (
            supabase
            .table("complaints")
            .select(
                "id,complaint_number,category,priority,status,"
                "assigned_department_id,submitted_at,resolved_at,"
                "sla_deadline,escalation_level,ai_analyzed"
            )
            .order("submitted_at")
            .execute()
        )

        department_result = (
            supabase
            .table("departments")
            .select("id,name")
            .execute()
        )

        complaints = complaint_result.data or []
        departments = department_result.data or []

        department_names = {
            item["id"]: item["name"]
            for item in departments
        }

        total = len(complaints)

        status_distribution = {}
        category_distribution = {}
        priority_distribution = {}
        department_workload = {}

        resolved_count = 0
        escalated_count = 0
        overdue_open = 0
        resolved_within_sla = 0
        resolved_with_sla_data = 0
        ai_analyzed_count = 0

        resolution_hours = []
        monthly_map = {}

        now = datetime.now(timezone.utc)

        for complaint in complaints:
            status = complaint.get("status") or "unknown"
            category = complaint.get("category") or "Other"
            priority = complaint.get("priority") or "unknown"

            status_distribution[status] = (
                status_distribution.get(status, 0) + 1
            )

            category_distribution[category] = (
                category_distribution.get(category, 0) + 1
            )

            priority_distribution[priority] = (
                priority_distribution.get(priority, 0) + 1
            )

            department_id = complaint.get(
                "assigned_department_id"
            )

            department_name = (
                department_names.get(
                    department_id,
                    "Unassigned"
                )
                if department_id
                else "Unassigned"
            )

            department_workload[department_name] = (
                department_workload.get(
                    department_name,
                    0
                )
                + 1
            )

            if complaint.get("ai_analyzed"):
                ai_analyzed_count += 1

            if (
                complaint.get("escalation_level")
                or 0
            ) > 0:
                escalated_count += 1

            submitted_at = complaint.get(
                "submitted_at"
            )

            if submitted_at:
                try:
                    submitted_dt = datetime.fromisoformat(
                        submitted_at.replace(
                            "Z",
                            "+00:00"
                        )
                    )

                    month_key = submitted_dt.strftime(
                        "%Y-%m"
                    )

                    if month_key not in monthly_map:
                        monthly_map[month_key] = {
                            "submitted": 0,
                            "resolved": 0,
                        }

                    monthly_map[month_key][
                        "submitted"
                    ] += 1
                except Exception:
                    submitted_dt = None
            else:
                submitted_dt = None

            if status == "resolved":
                resolved_count += 1

                resolved_at = complaint.get(
                    "resolved_at"
                )

                if (
                    resolved_at
                    and submitted_dt
                ):
                    try:
                        resolved_dt = (
                            datetime.fromisoformat(
                                resolved_at.replace(
                                    "Z",
                                    "+00:00"
                                )
                            )
                        )

                        hours = (
                            resolved_dt
                            - submitted_dt
                        ).total_seconds() / 3600

                        if hours >= 0:
                            resolution_hours.append(
                                hours
                            )

                        month_key = (
                            resolved_dt.strftime(
                                "%Y-%m"
                            )
                        )

                        if (
                            month_key
                            not in monthly_map
                        ):
                            monthly_map[
                                month_key
                            ] = {
                                "submitted": 0,
                                "resolved": 0,
                            }

                        monthly_map[month_key][
                            "resolved"
                        ] += 1
                    except Exception:
                        resolved_dt = None
                else:
                    resolved_dt = None

                sla_deadline = complaint.get(
                    "sla_deadline"
                )

                if (
                    sla_deadline
                    and resolved_dt
                ):
                    try:
                        deadline_dt = (
                            datetime.fromisoformat(
                                sla_deadline.replace(
                                    "Z",
                                    "+00:00"
                                )
                            )
                        )

                        resolved_with_sla_data += 1

                        if resolved_dt <= deadline_dt:
                            resolved_within_sla += 1
                    except Exception:
                        pass

            else:
                sla_deadline = complaint.get(
                    "sla_deadline"
                )

                if sla_deadline:
                    try:
                        deadline_dt = (
                            datetime.fromisoformat(
                                sla_deadline.replace(
                                    "Z",
                                    "+00:00"
                                )
                            )
                        )

                        if deadline_dt <= now:
                            overdue_open += 1
                    except Exception:
                        pass

        resolution_rate = (
            round(
                (resolved_count / total) * 100,
                1
            )
            if total
            else 0
        )

        ai_adoption_rate = (
            round(
                (ai_analyzed_count / total) * 100,
                1
            )
            if total
            else 0
        )

        sla_compliance_rate = (
            round(
                (
                    resolved_within_sla
                    / resolved_with_sla_data
                )
                * 100,
                1
            )
            if resolved_with_sla_data
            else 0
        )

        average_resolution_hours = (
            round(
                sum(resolution_hours)
                / len(resolution_hours),
                1
            )
            if resolution_hours
            else 0
        )

        monthly_trend = [
            {
                "month": month,
                "submitted": values[
                    "submitted"
                ],
                "resolved": values[
                    "resolved"
                ],
            }
            for month, values
            in sorted(monthly_map.items())
        ]

        return {
            "success": True,
            "generated_at": now.isoformat(),
            "overview": {
                "total_complaints": total,
                "resolved": resolved_count,
                "resolution_rate":
                    resolution_rate,
                "escalated":
                    escalated_count,
                "overdue_open":
                    overdue_open,
                "ai_analyzed":
                    ai_analyzed_count,
                "ai_adoption_rate":
                    ai_adoption_rate,
                "sla_compliance_rate":
                    sla_compliance_rate,
                "average_resolution_hours":
                    average_resolution_hours,
            },
            "status_distribution": (
                status_distribution
            ),
            "category_distribution": (
                category_distribution
            ),
            "priority_distribution": (
                priority_distribution
            ),
            "department_workload": (
                department_workload
            ),
            "monthly_trend": monthly_trend,
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to load analytics: "
                f"{str(error)}"
            )
        )

# ============================================================
# VC / EXECUTIVE DASHBOARD APIs
# Paste this code at the very end of main.py
# ============================================================


VC_ESCALATION_LEVEL = 4
HIGH_PRIORITY_VALUES = ["high", "critical"]


def vc_get_all_complaints():
    complaint_response = (
        supabase
        .table("complaints")
        .select("*")
        .order("submitted_at", desc=True)
        .execute()
    )

    department_response = (
        supabase
        .table("departments")
        .select("id,name")
        .execute()
    )

    complaints = complaint_response.data or []
    departments = department_response.data or []

    department_names = {
        item["id"]: item["name"]
        for item in departments
    }

    for complaint in complaints:
        department_id = complaint.get("assigned_department_id")

        complaint["assigned_department_name"] = (
            department_names.get(department_id, "Unassigned")
            if department_id
            else "Unassigned"
        )

    return complaints


def vc_is_closed_status(status):
    return str(status or "").lower() in [
        "resolved",
        "closed",
        "rejected",
    ]


def vc_is_overdue(complaint):
    if vc_is_closed_status(complaint.get("status")):
        return False

    deadline = complaint.get("sla_deadline")

    if not deadline:
        return False

    try:
        deadline_date = datetime.fromisoformat(
            str(deadline).replace("Z", "+00:00")
        )

        if deadline_date.tzinfo is None:
            deadline_date = deadline_date.replace(tzinfo=timezone.utc)

        return deadline_date < datetime.now(timezone.utc)

    except Exception:
        return False


@app.get("/vc/dashboard")
def vc_dashboard(
    authorization: Optional[str] = Header(default=None)
):
    """
    Executive / Vice Chancellor Dashboard Overview.

    Accessible to existing admin and super_admin users.
    """

    admin = get_authenticated_admin(authorization)

    complaints = vc_get_all_complaints()

    total_complaints = len(complaints)

    resolved_complaints = [
        complaint
        for complaint in complaints
        if vc_is_closed_status(complaint.get("status"))
    ]

    open_complaints = [
        complaint
        for complaint in complaints
        if not vc_is_closed_status(complaint.get("status"))
    ]

    escalated_complaints = [
        complaint
        for complaint in complaints
        if str(complaint.get("status", "")).lower() == "escalated"
        or int(complaint.get("escalation_level") or 0) > 0
    ]

    vc_level_complaints = [
        complaint
        for complaint in complaints
        if int(complaint.get("escalation_level") or 0)
        >= VC_ESCALATION_LEVEL
    ]

    high_priority_complaints = [
        complaint
        for complaint in complaints
        if str(complaint.get("priority", "")).lower()
        in HIGH_PRIORITY_VALUES
    ]

    overdue_complaints = [
        complaint
        for complaint in complaints
        if vc_is_overdue(complaint)
    ]

    resolution_rate = 0

    if total_complaints > 0:
        resolution_rate = round(
            (len(resolved_complaints) / total_complaints) * 100,
            2
        )

    department_workload = {}

    for complaint in complaints:
        department_name = (
            complaint.get("assigned_department_name")
            or complaint.get("department_name")
            or complaint.get("assigned_department_id")
            or "Unassigned"
        )

        if department_name not in department_workload:
            department_workload[department_name] = {
                "department": department_name,
                "total": 0,
                "open": 0,
                "resolved": 0,
                "escalated": 0,
                "overdue": 0,
            }

        department_workload[department_name]["total"] += 1

        if vc_is_closed_status(complaint.get("status")):
            department_workload[department_name]["resolved"] += 1
        else:
            department_workload[department_name]["open"] += 1

        if (
            str(complaint.get("status", "")).lower() == "escalated"
            or int(complaint.get("escalation_level") or 0) > 0
        ):
            department_workload[department_name]["escalated"] += 1

        if vc_is_overdue(complaint):
            department_workload[department_name]["overdue"] += 1

    recent_escalations = sorted(
        escalated_complaints,
        key=lambda item: item.get("submitted_at") or "",
        reverse=True
    )[:10]

    return {
        "success": True,
        "generated_at": datetime.now(timezone.utc).isoformat(),

        "executive": {
            "admin_id": admin.get("id"),
            "admin_role": admin.get("role"),
        },

        "overview": {
            "total_complaints": total_complaints,
            "open_complaints": len(open_complaints),
            "resolved_complaints": len(resolved_complaints),
            "resolution_rate": resolution_rate,
            "escalated_complaints": len(escalated_complaints),
            "vc_level_complaints": len(vc_level_complaints),
            "high_priority_complaints": len(high_priority_complaints),
            "overdue_complaints": len(overdue_complaints),
        },

        "department_workload": list(
            department_workload.values()
        ),

        "recent_escalations": recent_escalations,
    }


@app.get("/vc/escalations")
def vc_escalations(
    authorization: Optional[str] = Header(default=None),
    level: Optional[int] = None,
    status: Optional[str] = None,
):
    """
    Get escalated complaints for VC / Executive review.

    Optional filters:
    - level
    - status
    """

    get_authenticated_admin(authorization)

    complaints = vc_get_all_complaints()

    escalations = []

    for complaint in complaints:
        escalation_level = int(
            complaint.get("escalation_level") or 0
        )

        complaint_status = str(
            complaint.get("status") or ""
        ).lower()

        is_escalated = (
            escalation_level > 0
            or complaint_status == "escalated"
        )

        if not is_escalated:
            continue

        if level is not None and escalation_level != level:
            continue

        if status is not None and complaint_status != status.lower():
            continue

        escalations.append(complaint)

    escalations.sort(
        key=lambda item: item.get("submitted_at") or "",
        reverse=True
    )

    return {
        "success": True,
        "count": len(escalations),
        "escalations": escalations,
    }


@app.get("/vc/complaints/{complaint_id}")
def vc_complaint_detail(
    complaint_id: str,
    authorization: Optional[str] = Header(default=None),
):
    """
    Get one complaint detail for executive review.
    """

    get_authenticated_admin(authorization)

    response = (
        supabase
        .table("complaints")
        .select("*")
        .eq("id", complaint_id)
        .limit(1)
        .execute()
    )

    complaints = response.data or []

    if not complaints:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found"
        )

    complaint = complaints[0]

    return {
        "success": True,
        "complaint": complaint,
    }


@app.get("/vc/summary")
def vc_summary(
    authorization: Optional[str] = Header(default=None),
):
    """
    Small summary API for VC dashboard cards.
    """

    get_authenticated_admin(authorization)

    complaints = vc_get_all_complaints()

    total = len(complaints)

    resolved = sum(
        1
        for complaint in complaints
        if vc_is_closed_status(complaint.get("status"))
    )

    escalated = sum(
        1
        for complaint in complaints
        if (
            str(complaint.get("status", "")).lower() == "escalated"
            or int(complaint.get("escalation_level") or 0) > 0
        )
    )

    overdue = sum(
        1
        for complaint in complaints
        if vc_is_overdue(complaint)
    )

    vc_level = sum(
        1
        for complaint in complaints
        if int(complaint.get("escalation_level") or 0)
        >= VC_ESCALATION_LEVEL
    )

    return {
        "success": True,
        "total": total,
        "resolved": resolved,
        "open": total - resolved,
        "escalated": escalated,
        "overdue": overdue,
        "vc_level": vc_level,
    }

# ============================================================
# VC - ALL COMPLAINTS
# ============================================================

@app.get("/vc/complaints")
def vc_all_complaints(
    authorization: Optional[str] = Header(default=None),
):
    """
    Get all university complaints for VC / Executive dashboard.
    """

    # Only authenticated admin / super_admin
    get_authenticated_admin(authorization)

    complaints = vc_get_all_complaints()

    return {
        "success": True,
        "count": len(complaints),
        "complaints": complaints,
    }
