import pytest
from unittest.mock import MagicMock
from app.controllers.student import update_profile
from app.models.user import User, UserRole
from app.models.profile import Profile
from app.schemas.user_schema import ProfileUpdate

@pytest.mark.asyncio
async def test_update_profile_does_not_escalate_role():
    # Mock database session
    db = MagicMock()

    # Mock current user (a student)
    current_user = User(id=1, role=UserRole.STUDENT)

    # Mock profile
    profile = Profile(user_id=1, grad_year=0)
    db.query.return_value.filter.return_value.first.return_value = profile

    # Mock profile update data with grad_year
    profile_data = ProfileUpdate(grad_year=2024)

    # Call the controller function
    result = await update_profile(profile_data=profile_data, current_user=current_user, db=db)

    # Verify profile was updated
    assert profile.grad_year == 2024

    # Verify user role is still STUDENT (the fix)
    assert current_user.role == UserRole.STUDENT

    # Verify db.commit was called
    db.commit.assert_called_once()
