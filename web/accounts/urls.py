from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    path('signup/terms/', views.signup_terms, name='signup_terms'),
    path('signup/name/', views.signup_name, name='signup_name'),
]
