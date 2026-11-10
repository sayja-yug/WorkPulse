from decimal import Decimal
from django.db import transaction
from django.db.models import Sum
from .models import CashTransaction


class CashbookService:
    @classmethod
    def get_current_balance(cls, business):
        """Calculates net cashbook balance: total CASH_IN minus total CASH_OUT."""
        cash_in = CashTransaction.objects.filter(
            business=business,
            type=CashTransaction.Type.CASH_IN
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        cash_out = CashTransaction.objects.filter(
            business=business,
            type=CashTransaction.Type.CASH_OUT
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        return cash_in - cash_out

    @classmethod
    @transaction.atomic
    def record_transaction(cls, business, tx_type, amount, description, date, created_by, category=None, payment_mode='Cash', reference=''):
        current_bal = cls.get_current_balance(business)
        dec_amount = Decimal(str(amount))

        if tx_type == CashTransaction.Type.CASH_IN:
            new_bal = current_bal + dec_amount
        else:
            new_bal = current_bal - dec_amount

        tx = CashTransaction.objects.create(
            business=business,
            type=tx_type,
            amount=dec_amount,
            category=category,
            description=description,
            payment_mode=payment_mode,
            reference=reference,
            date=date,
            balance_after=new_bal,
            created_by=created_by
        )
        return tx
