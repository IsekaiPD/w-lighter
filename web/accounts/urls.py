from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    path('signup/terms/', views.signup_terms, name='signup_terms'),
    path('signup/name/', views.signup_name, name='signup_name'),
    path('withdraw/', views.withdraw, name='withdraw'),
    path('withdraw/complete/', views.withdraw_complete, name='withdraw_complete'),
]
