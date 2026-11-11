from rest_framework import viewsets, permissions, views, status
from rest_framework.response import Response
from .models import SubscriptionPlan, Subscription, Invoice
from .serializers import SubscriptionPlanSerializer, SubscriptionSerializer, InvoiceSerializer


class SubscriptionPlanViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [permissions.AllowAny]
    queryset = SubscriptionPlan.objects.filter(is_active=True)


class CurrentSubscriptionView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        business = getattr(request, 'business', None)
        if not business:
            return Response({'success': False, 'error': {'message': 'No business context selected.'}}, status=status.HTTP_400_BAD_REQUEST)

        sub = Subscription.objects.filter(business=business).first()
        if not sub:
            # Fallback default plan for unassigned business
            plan = SubscriptionPlan.objects.filter(code='PRO').first() or SubscriptionPlan.objects.first()
            if plan:
                from django.utils import timezone
                today = timezone.now().date()
                sub = Subscription.objects.create(
                    business=business,
                    plan=plan,
                    status=Subscription.Status.ACTIVE,
                    current_period_start=today,
                    current_period_end=today + timezone.timedelta(days=365)
                )

        if sub:
            return Response({'success': True, 'data': SubscriptionSerializer(sub).data})
        return Response({'success': False, 'error': {'message': 'No subscription found.'}}, status=status.HTTP_404_NOT_FOUND)


class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        business = getattr(self.request, 'business', None)
        return Invoice.objects.filter(business=business)

