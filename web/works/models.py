from django.conf import settings
from django.db import models


class Work(models.Model):
    """
    ERD WORKS 테이블.
    managed=False → FastAPI가 스키마 소유. Django는 migrate 시 건드리지 않음.
    ORM CRUD(작품 등록/수정/삭제)는 정상 동작.
    """

    GENRE_CHOICES = [
        ('로맨스', '로맨스'),
        ('판타지', '판타지'),
        ('로맨스 판타지', '로맨스 판타지'),
        ('시대극', '시대극'),
        ('현대물', '현대물'),
        ('무협', '무협'),
        ('SF', 'SF'),
        ('공포', '공포'),
        ('미스터리', '미스터리'),
        ('기타', '기타'),
    ]

    work_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column='user_id',
        related_name='works',
    )
    title = models.CharField(max_length=50)
    pen_name = models.CharField(max_length=10)
    genre = models.CharField(max_length=10, choices=GENRE_CHOICES)
    synopsis = models.CharField(max_length=10000, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'works'
        # 로컬 SQLite에서 테이블 생성됨
        # RDS 배포 시: migrate --fake-initial 로 기존 테이블과 충돌 방지

    def __str__(self):
        return self.title


class Episode(models.Model):
    """
    ERD EPISODES 테이블.
    managed=False → FastAPI 소유. Django는 회차 CRUD만.
    """

    episode_id = models.AutoField(primary_key=True)
    work = models.ForeignKey(
        Work,
        on_delete=models.CASCADE,
        db_column='work_id',
        related_name='episodes',
    )
    title = models.CharField(max_length=30)
    original_text = models.CharField(max_length=8000)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'episodes'

    def __str__(self):
        return self.title
