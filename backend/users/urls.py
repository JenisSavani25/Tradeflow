from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import RegisterView, LoginView, ProfileView, AddCapitalView, WithdrawCapitalView, GoogleLoginView

urlpatterns = [
    path('register/',           RegisterView.as_view(),      name='auth-register'),
    path('login/',              LoginView.as_view(),          name='auth-login'),
    path('google/',             GoogleLoginView.as_view(),    name='auth-google'),
    path('token/refresh/',      TokenRefreshView.as_view(),   name='token-refresh'),
    path('profile/',            ProfileView.as_view(),        name='auth-profile'),
    path('capital/add/',        AddCapitalView.as_view(),     name='capital-add'),
    path('capital/withdraw/',   WithdrawCapitalView.as_view(),name='capital-withdraw'),
]
