from django.urls import path
from . import views

app_name = 'relationships'

urlpatterns = [
    path('', views.relationship, name='relationship'),
]