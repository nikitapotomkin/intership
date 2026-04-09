# hw-3

Написати веб-сервер (на Express) для завантаження великих файлів частками, передбачити інтерфейс списку завантажених файлів, просмотр файлу, видалення файлу, статус виконання завантаження. Додати ліміт (квоту) на файлове сховище, який встановлюється додатковим роутом.

## 📋 API Ендпоінти

### 🌐 Інтерфейс
* `GET /` — Головна сторінка (UI).

### 📂 Файли
* `GET /api/v1/files` — Список усіх файлів.
* `GET /api/v1/files/:fileName` — Перегляд або скачування файлу.
* `DELETE /api/v1/files/:fileName` — Видалення файлу.

### 📤 Завантаження (Chunks)
1. **Init:** `POST /api/v1/uploads/` — Початок завантаження (отримання ID).
2. **Chunk:** `POST /api/v1/uploads/:id/chunks/:chunkIndex` — Передача частини файлу.
3. **Complete:** `POST /api/v1/uploads/:id/complete` — Фінальна збірка файлу.
4. **Status:** `GET /api/v1/uploads/:id` — Перевірка прогресу.

### 👤️ Адмін
3. `PATCH /api/v1/admin/settings` — Оновлення налаштувань.
4. `GET /api/v1/admin/settings` — Перегляд налаштувань.

## 🔧 Встановлення та запуск

1.  **Клонуйте репозиторій:**
    ```bash
    git clone -b hw-2 https://github.com/nikitapotomkin/intership.git
    cd intership
    ```

2.  **Встановіть залежності:**
    ```bash
    npm install
    ```

3.  **Налаштування оточення:**

    ```env
    PORT=4354
    REDIS_HOST='localhost'
    REDIS_PORT=6379
    ADMIN_TOKEN=test123
    STORAGE_QUOTA=1073741824
    CHUNK_SIZE=1048576
    ```

4.  **Запустіть сервер:**
    ```bash
    npm run start
    ```

## Запуск Docker

1.  **Створіть image:**
    ```bash
    docker-compose build
    ```

2.  **Запустіть контейнер:**
    ```bash
    docker-compose up
    ```

## 📖 Логіка завантаження частинами

1. Клієнт викликає `/api/v1/uploads/`, щоб створити нову сесію.
2. Клієнт розбиває файл на частини і надсилає кожну частину на `/api/v1/uploads/:id/chunks/:chunkIndex` разом із параметрами в URL.
3. Після відправки всіх частин викликається `/api/v1/uploads/:id/complete`, що дає сигнал серверу об'єднати всі тимчасові чанки в один фінальний файл.

---

