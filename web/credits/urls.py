from django.urls import path
from . import views

app_name = 'credits'

urlpatterns = [
    path('charge/', views.credit_charge, name='credit_charge'),
    path('history/', views.credit_history, name='credit_history'),
]