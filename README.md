# hw-4

Написати REST API сервер на Nest.js, який реалізує функціонал зберігпння файлів різних користувачів, а саме: має бути інтерфейс створення-огляду-видалення користувачів; кожен користувач має інтерфейс перегляду-створення-видаення файлів але лише своїх; у кожного користувача є свою окрема квота розміру файлів у сховищі, задається при створенні користувача; не користуємось базами, працюємо лише з файлами; кожен користувацький запит повинен мати в тіл поля email i password для авторизації запиту.

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
  "password": "123456",
  "quotaMb": 100
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

#### Видалити ВСІ файли користувача

```
DELETE /files/user/all
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

```bash id="u16"
npm install
npm run start
```

---
