# hw-5

Oновити попередньо написаний сервер таким чином, щоб додати ацтентифікацію користувача та авторизацію ролі Адмін. Користувач має отримати статичну сторінку з своїми файлами та інструменти їх керуванням, адмін має отримати адмінску сторінку де є всі користувачі, всі їх файли, та механізи керування кваотами для будь-якого користувача, а також інструмент блокування користувацьгого запису - якщо користучача заблоковано, то має бути показана інформаційна сторінка щодо блокування.

---

## 🚀 Можливості

* 📁 Завантаження файлів (multipart/form-data)
* 👁 Перегляд файлів (inline)
* ⬇ Завантаження файлів
* ❌ Видалення файлів
* 👤 Керування користувачами
* 📊 Квоти (usedBytes / quotaBytes)
* 💾 Зберігання даних у JSON (без бази даних)

---

## 📁 Структура даних

### users.json

```
{
  "users": [
    {
      "id": "uuid",
      "email": "user@mail.com",
      "password": "hashed_password",
      "quotaBytes": 104857600,
      "role": "admin",
      "isBlocked": false,
      "usedBytes": 0,
      "createdAt": "2026-04-17T00:00:00.000Z"
    }
  ]
}
```

### files.json

```
{
  "files": [
    {
      "id": "uuid",
      "originalName": "file.png",
      "mimeType": "image/png",
      "sizeBytes": 12345,
      "path": "uploads/file.png",
      "userId": "uuid",
      "uploadedAt": "2026-04-17T00:00:00.000Z"
    }
  ]
}
```

---

## 🔐 Авторизація

У всіх захищених запитах використовуються headers:

```
x-email: user@mail.com
x-password: 123456
```
---

## 🌐 Статичні файли (Frontend)

Проєкт віддає фронтенд як статичні файли через NestJS:

```
http://localhost:4568/static/file_storage.html
```
---

## 📡 API Endpoints

### 👤 Користувачі

#### Створити користувача

```
POST /users
Content-Type: application/json
```

```json
{
  "email": "user@mail.com",
  "password": "123456"
}
```

---

#### Отримати всіх користувачів

```
GET /users
```

---

#### Отримати користувача

```
GET /users/:id
```

---

#### Видалити поточного користувача

```
DELETE /users
```

---

### 📁 Файли

#### Отримати файли користувача

```
GET /files
```

---

#### Завантажити файл

```
POST /files
Content-Type: multipart/form-data
```

Form-data:

```
file: (file)
```

---

#### Перегляд файлу

```
GET /files/:fileId/view
```

* inline відкриття для:

  * зображень
  * PDF
  * відео
* інакше — завантаження

---

#### Завантажити файл (download)

```
GET /files/:fileId/download
```

---

#### Видалити файл

```
DELETE /files/:fileId
```
---

### 💼 Адмін

#### Отримати всіх користувачів

```
GET /admin/users
```

---

#### Редагувати користувача (зміна квоти)

```
PATCH /admin/users/:id
```

---

#### Видалити користувача

```
DELETE /admin/users/:id
```

---

#### Отримати всі файли системи

```
GET /admin/files
```

---

#### Перегляд будь-якого файлу (inline)

```
GET /admin/files/:fileId/view
```

---

#### Завантажити будь-який файл (download)

```
GET /admin/files/:fileId/download
```

---

#### Видалити будь-який файл

```
DELETE /admin/files/:fileId
```

---

## 📊 Квоти

* `quotaBytes` — максимальний ліміт
* `usedBytes` — використано

Під час завантаження:

* перевіряється ліміт
* оновлюється `usedBytes`

---

## 🧪 Запуск

```
npm install
npm run start
```

---
