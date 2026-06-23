# 로컬 Django ↔ RDS 연결 가이드

내 노트북의 Django를 모델 서버가 쓰는 **RDS(MySQL)**에 붙여서, 생성 결과(번역/캐릭터/관계도/표지/가이드)가 실제로 DB에 저장되는지 테스트하기 위한 문서입니다.

---

## 0. 구조 한눈에

```
브라우저 → Django(내 노트북) → FastAPI 모델 서버(EC2) → RDS
                  └─────────── 같은 RDS 에 저장/조회 ───────────┘
```

- Django와 모델 서버가 **같은 RDS**를 봐야 `work_id`가 맞아떨어지고 결과가 저장됩니다.
- RDS는 외부(집/회사 인터넷)에서 **직접 접속이 막혀 있습니다.** (서브넷이 프라이빗)
- 그래서 **EC2를 경유하는 SSH 터널**로 붙습니다: `내 노트북 → EC2 → RDS`.

> 로컬에서 RDS 직접 연결은 안 됩니다. 반드시 아래 SSH 터널 방식을 사용하세요.

---

## 1. 미리 필요한 것

| 항목 | 설명 |
| --- | --- |
| `wlighter-key.pem` | EC2 접속용 키. 팀에서 받기. **절대 git에 올리지 말 것** (`.gitignore`에 `*.pem` 등록되어 있음) |
| 내 공인 IP | `curl ifconfig.me` 로 확인 |
| EC2 보안그룹에 내 IP 등록 | AWS → EC2 → 인스턴스(3.38.235.44) → 보안 → 보안그룹 → 인바운드 **SSH(22)** 에 내 IP 추가 |

> RDS 보안그룹은 건드릴 필요 없습니다(터널이 EC2를 통해 들어가므로). EC2의 **22번**만 열면 됩니다.

---

## 2. SSH 터널 열기 (PowerShell)

> ⚠️ 처음 한 번, pem 권한 에러(`UNPROTECTED PRIVATE KEY FILE`)가 나면 아래 2줄 먼저 실행:
> ```powershell
> icacls C:\skn24\w-lighter\wlighter-key.pem /inheritance:r
> icacls C:\skn24\w-lighter\wlighter-key.pem /grant:r "$($env:USERNAME):(R)"
> ```

터널 명령:

```powershell
ssh -i C:\skn24\w-lighter\wlighter-key.pem -N -L 13306:w-lighter-db.c5qccsse4nyj.ap-northeast-2.rds.amazonaws.com:3306 ubuntu@3.38.235.44
```

- `-N` 이라 **아무 출력 없이 멈춰 있으면 성공**입니다. 이 창은 **계속 켜두세요**(닫으면 DB 끊김).
- 의미: 내 노트북의 `13306` 포트 → EC2 → RDS의 `3306` 으로 연결.

확인(새 터미널):

```powershell
Test-NetConnection 127.0.0.1 -Port 13306   # TcpTestSucceeded : True 면 OK
```

---

## 3. `.env` 설정 (`web/.env`)

`web/.env.example` 을 복사해 `web/.env` 를 만들고, DB 부분을 **터널 기준**으로:

```env
DB_HOST=127.0.0.1
DB_PORT=13306
DB_NAME=wlighter
DB_USER=wlighter
DB_PASSWORD=<팀 공유 비밀번호>
```

> 비밀번호 등 나머지 값(OAuth, OpenAI 등)은 팀 공유 `.env` 참고. `.env` 와 `*.pem` 은 **절대 커밋 금지**(gitignore 되어 있음).
>
> 그냥 로컬 SQLite로 개발하려면 `DB_HOST` 를 비워두면 됩니다(코드는 동작, 저장만 로컬).

---

## 4. 마이그레이션

> 공유 RDS에는 이미 테이블과 Django 인프라 테이블이 만들어져 있습니다. 보통은 아래가 "적용할 것 없음"으로 끝납니다.

```powershell
cd C:\skn24\w-lighter\web
python manage.py migrate --fake-initial
```

- 이미 존재하는 앱 테이블(`users`/`works`/`episodes` 등)은 **FAKED**(건너뜀), 없는 것만 생성됩니다.
- ⚠️ 절대 그냥 `migrate` 로 공유 테이블을 새로 만들거나 지우지 마세요.

---

## 5. 동작 확인 (저장되는지)

```powershell
python manage.py runserver
```

1. 브라우저에서 **소셜 로그인** → RDS `users` 에 가입됨
2. **작품 등록(줄거리=시놉시스 포함)**
3. 그 작품으로 **캐릭터 추출 / 관계도 / 표지 / 가이드** 생성
4. 응답에 `persisted: saved: true` 가 뜨면 성공 ✅

DB 직접 확인(셸):

```powershell
python manage.py shell
```
```python
from django.db import connection
cur = connection.cursor()
cur.execute("SELECT character_id, char_name FROM characters ORDER BY 1 DESC LIMIT 10")
print(cur.fetchall())
```

---

## 6. 다음 작업 때 순서 (요약)

1. 터널 켜기 (2번 ssh 명령) — 창 유지
2. `python manage.py runserver`
3. 작업 끝나면 터널 창 닫기

---

## 7. 자주 나는 에러

| 증상 | 원인 / 해결 |
| --- | --- |
| `(2002, ... 10060)` 연결 타임아웃 | RDS 직접 접속 시도. → **SSH 터널** 쓰고 `.env` 를 `127.0.0.1:13306` 으로 |
| `ssh: connect to host ... port 22: timed out` | EC2 보안그룹에 내 IP(22) 미등록 또는 네트워크가 22 차단. → SG에 내 IP 추가, 안 되면 핫스팟 |
| `UNPROTECTED PRIVATE KEY FILE` | pem 권한 과다. → 2번의 `icacls` 2줄 실행 |
| 터널 창이 멈춰서 출력 없음 | **정상**(`-N` 터널 유지 상태). 닫지 말 것 |
| `saved: false, work_id N not found` | 그 작품이 RDS에 없음. → RDS에 붙은 상태에서 작품을 **새로 등록**한 뒤 생성 |

---

## 8. 보안 주의

- `.env`, `*.pem` 은 **절대 git 커밋 금지** (`.gitignore` 등록됨)
- RDS/EC2 보안그룹 소스를 `0.0.0.0/0`(전체 허용)으로 열었다면 **테스트 후 반드시 내 IP로 되돌리기**
- 집 IP가 바뀌면(재접속/네트워크 변경) EC2 보안그룹의 내 IP 규칙을 갱신해야 함
