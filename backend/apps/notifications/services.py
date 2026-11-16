import logging
from django.db import transaction
from django.utils import timezone
from .models import Notification

logger = logging.getLogger(__name__)


def create_notification(user, business=None, title="", message="", notif_type=Notification.Type.INFO, data=None):
    """
    Safely creates an in-app Notification for a specific user.
    """
    if not user:
        return None

    try:
        if not business and hasattr(user, 'active_business') and user.active_business:
            business = user.active_business

        notif = Notification.objects.create(
            user=user,
            business=business,
            title=title.strip(),
            message=message.strip(),
            type=notif_type,
            data=data or {},
            is_read=False
        )
        return notif
    except Exception as exc:
        logger.exception("Failed to create notification for user %s: %s", getattr(user, 'email', str(user)), exc)
        return None


def get_business_managers(business, exclude_user=None):
    """
    Returns a queryset / list of User objects who have managerial/ownership roles
    for the specified business.
    """
    if not business:
        return []

    from apps.businesses.models import BusinessMembership
    from apps.accounts.models import UserRole, User

    manager_user_ids = set()

    try:
        # 1. Direct Business Membership Owners
        owner_ids = BusinessMembership.objects.filter(
            business=business,
            is_owner=True,
            is_active=True
        ).values_list('user_id', flat=True)
        manager_user_ids.update(owner_ids)

        # 2. Roles: BUSINESS_OWNER, HR_MANAGER, SUPER_ADMIN, ACCOUNTANT, BRANCH_MANAGER
        role_user_ids = UserRole.objects.filter(
            business=business,
            role__code__in=['BUSINESS_OWNER', 'HR_MANAGER', 'SUPER_ADMIN', 'ACCOUNTANT', 'BRANCH_MANAGER']
        ).values_list('user_id', flat=True)
        manager_user_ids.update(role_user_ids)

        # 3. Superusers and global admins attached to business
        superusers = User.objects.filter(
            is_superuser=True,
            is_active=True
        ).values_list('id', flat=True)
        manager_user_ids.update(superusers)

    except Exception as exc:
        logger.exception("Error determining business managers for %s: %s", business, exc)

    if exclude_user and hasattr(exclude_user, 'id'):
        manager_user_ids.discard(exclude_user.id)

    return User.objects.filter(id__in=manager_user_ids, is_active=True).distinct()


def notify_business_managers(business, title, message, notif_type=Notification.Type.INFO, exclude_user=None, data=None):
    """
    Broadcasts a notification to all owners, HR managers, and administrators of a business.
    """
    if not business:
        return []

    managers = get_business_managers(business, exclude_user=exclude_user)
    created_notifs = []
    for manager in managers:
        n = create_notification(
            user=manager,
            business=business,
            title=title,
            message=message,
            notif_type=notif_type,
            data=data
        )
        if n:
            created_notifs.append(n)

    return created_notifs


def notify_employee(employee, title, message, notif_type=Notification.Type.INFO, data=None):
    """
    Sends a notification directly to the user account associated with the given Employee record.
    If the Employee.user relation is unset, looks up the User by email and links it automatically.
    """
    if not employee:
        return None

    try:
        user = getattr(employee, 'user', None)
        if not user and employee.email:
            from apps.accounts.models import User
            user = User.objects.filter(email__iexact=employee.email).first()
            if user:
                employee.user = user
                employee.save(update_fields=['user'])

        if not user:
            logger.info("Cannot notify employee %s (%s): No linked User found.", employee.id, employee.full_name)
            return None

        return create_notification(
            user=user,
            business=employee.business,
            title=title,
            message=message,
            notif_type=notif_type,
            data=data
        )
    except Exception as exc:
        logger.exception("Failed to notify employee %s: %s", getattr(employee, 'id', 'unknown'), exc)
        return None


def notify_all_employees(business, title, message, notif_type=Notification.Type.INFO, data=None):
    """
    Broadcasts a notification to all active employees in a business who have a linked User.
    """
    if not business:
        return []

    from apps.employees.models import Employee
    employees = Employee.objects.filter(business=business, status=Employee.Status.ACTIVE)
    results = []
    for emp in employees:
        n = notify_employee(emp, title=title, message=message, notif_type=notif_type, data=data)
        if n:
            results.append(n)
    return results

