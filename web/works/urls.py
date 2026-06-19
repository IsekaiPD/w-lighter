from django.urls import path
from . import views

app_name = 'works'

urlpatterns = [
    path('works/', views.library, name='library'),
    path('works/<int:pk>/', views.work_detail, name='work_detail'),
    path('works/<int:work_pk>/episodes/<int:episode_pk>/', views.episode_detail, name='episode_detail'),
    path('works/<int:work_pk>/episodes/<int:episode_pk>/translate/', views.episode_translate, name='episode_translate'),
    path('works/<int:work_pk>/episodes/new/', views.episode_register, name='episode_register'),
    path('works/<int:work_pk>/episodes/<int:episode_pk>/edit/', views.episode_edit, name='episode_edit'),
]
