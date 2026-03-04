from rest_framework import serializers
from django.contrib.auth import get_user_model
from decimal import Decimal

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    initial_capital = serializers.DecimalField(
        max_digits=15, decimal_places=2, required=False, default=Decimal('0.00')
    )

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'initial_capital']

    def create(self, validated_data):
        initial_capital = validated_data.pop('initial_capital', Decimal('0.00'))
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
        )
        user.total_capital = initial_capital
        user.available_capital = initial_capital
        user.save()
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email',
            'total_capital', 'available_capital', 'risk_percent',
            'created_at', 'date_joined'
        ]
        read_only_fields = ['id', 'username', 'created_at', 'date_joined']


class CapitalSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=15, decimal_places=2)

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than 0.")
        return value
