from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model, authenticate
from .serializers import RegisterSerializer, UserProfileSerializer, CapitalSerializer
import urllib.request
import json

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/ — Public"""
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserProfileSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """POST /api/auth/login/ — Public"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')

        if not username or not password:
            return Response(
                {'error': 'Username and password are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(request, username=username, password=password)
        if not user:
            return Response(
                {'error': 'Invalid credentials.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserProfileSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })


class GoogleLoginView(APIView):
    """POST /api/auth/google/ — Public Google Auth"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get('credential')
        if not token:
            return Response({'error': 'No credential provided.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Verify token with Google's public tokeninfo endpoint
            url = f"https://oauth2.googleapis.com/tokeninfo?id_token={token}"
            with urllib.request.urlopen(url) as response:
                payload = json.loads(response.read().decode())
            
            if payload.get('aud') is None: # In production, verify aud matches your CLIENT_ID
                pass
                
            email = payload.get('email')
            name = payload.get('name') or email.split('@')[0]
            
            # Find or create user
            user, created = User.objects.get_or_create(email=email, defaults={'username': email.split('@')[0]})
            if created:
                user.set_unusable_password() 
                user.available_capital = 0.00 # Default capital for new accounts
                user.total_capital = 0.00
                user.save()

            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserProfileSerializer(user).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            })
            
        except Exception as e:
            return Response({'error': 'Invalid Google token.'}, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/auth/profile/"""
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class AddCapitalView(APIView):
    """POST /api/auth/capital/add/ — Add capital to account"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CapitalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        amount = serializer.validated_data['amount']
        try:
            request.user.add_capital(amount)
            request.user.refresh_from_db()
            return Response({
                'message': f'₹{amount:,.2f} added successfully.',
                'total_capital':     str(request.user.total_capital),
                'available_capital': str(request.user.available_capital),
                'user':              UserProfileSerializer(request.user).data,
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class WithdrawCapitalView(APIView):
    """POST /api/auth/capital/withdraw/ — Withdraw cash (available capital only)"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CapitalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        amount = serializer.validated_data['amount']
        user   = request.user
        user.refresh_from_db()
        if amount > user.available_capital:
            return Response(
                {'error': f'Cannot withdraw ₹{amount}. Only ₹{user.available_capital} is available.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.available_capital -= amount
        user.total_capital     -= amount
        user.save(update_fields=['available_capital', 'total_capital'])
        return Response({
            'message': f'₹{amount:,.2f} withdrawn successfully.',
            'total_capital':     str(user.total_capital),
            'available_capital': str(user.available_capital),
            'user':              UserProfileSerializer(user).data,
        })
