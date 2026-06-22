from django.urls import path
from . import views

app_name = 'guides'

urlpatterns = [
    path('', views.localization, name='localization'),
    path('generate/', views.guide_generate, name='guide_generate'),
]
