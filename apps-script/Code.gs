/**
 * Backend Script for Prikamye Motocross Landing Page
 * Handles POST requests, appends to Google Sheets, and forwards to Telegram.
 *
 * Настройка секретов:
 * Не храните токен и chat_id в коде. Задайте их в
 * Project Settings → Script Properties:
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
 */

const CONFIG = {
  sheetName: 'Заявки',
  corsHeaders: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  }
};

const REQUIRED_FIELDS = ['name', 'phone', 'service'];

/**
 * Handles incoming POST requests (Form Submission)
 */
function doPost(e) {
  try {
    const payload = extractPayload(e);
    validatePayload(payload);

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(CONFIG.sheetName);
    if (!sheet) {
      throw new Error(`Sheet "${CONFIG.sheetName}" not found.`);
    }

    // 1. Save to Database (Google Sheets)
    saveToSheet(sheet, payload);

    // 2. Notify Administrator (Telegram) — не должно ронять успешный ответ пользователю
    try {
      sendTelegramNotification(payload);
    } catch (notifyError) {
      Logger.log('Telegram notify failed: ' + notifyError);
    }

    return createJsonResponse({ result: 'success', message: 'Data saved successfully.' });

  } catch (error) {
    Logger.log('doPost error: ' + error);
    return createJsonResponse({ result: 'error', message: String(error) });
  }
}

/**
 * Handles Preflight OPTIONS requests for CORS
 */
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setHeaders(CONFIG.corsHeaders);
}

/**
 * Простой health-check для проверки, что веб-приложение опубликовано
 */
function doGet(e) {
  return createJsonResponse({ result: 'ok', message: 'Prikamye backend is running.' });
}

/**
 * Extracts and sanitizes parameters from the request event
 */
function extractPayload(e) {
  const p = (e && e.parameter) ? e.parameter : {};
  return {
    date: new Date(),
    name: sanitize(p.name),
    phone: sanitize(p.phone),
    service: sanitize(p.service),
    comment: p.comment ? sanitize(p.comment) : '-',
    status: 'Новая'
  };
}

function sanitize(value) {
  if (!value) return 'Не указано';
  // Ограничиваем длину и убираем управляющие символы
  return String(value).trim().slice(0, 500);
}

/**
 * Проверка обязательных полей на сервере (дублирует клиентскую валидацию —
 * форма могла быть вызвана напрямую, в обход фронтенда)
 */
function validatePayload(payload) {
  REQUIRED_FIELDS.forEach((field) => {
    if (!payload[field] || payload[field] === 'Не указано') {
      throw new Error(`Обязательное поле не заполнено: ${field}`);
    }
  });
}

/**
 * Appends a row to the designated sheet
 */
function saveToSheet(sheet, data) {
  sheet.appendRow([
    data.date,
    data.name,
    data.phone,
    data.service,
    data.comment,
    data.status
  ]);
}

/**
 * Экранирует спецсимволы Telegram Markdown, чтобы данные пользователя
 * не могли сломать форматирование сообщения
 */
function escapeMarkdown(text) {
  return String(text).replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

/**
 * Sends a Markdown-formatted message via Telegram Bot API
 */
function sendTelegramNotification(data) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('TELEGRAM_BOT_TOKEN');
  const chatId = props.getProperty('TELEGRAM_CHAT_ID');

  if (!token || !chatId) {
    throw new Error('TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID не заданы в Script Properties.');
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const message = `*Новая заявка: Прикамье*\n\n` +
                  `Имя: ${escapeMarkdown(data.name)}\n` +
                  `Телефон: ${escapeMarkdown(data.phone)}\n` +
                  `Услуга: ${escapeMarkdown(data.service)}\n` +
                  `Комментарий: ${escapeMarkdown(data.comment)}`;

  const options = {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    payload: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown'
    })
  };

  UrlFetchApp.fetch(url, options);
}

/**
 * Helper to build JSON responses with CORS headers
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders(CONFIG.corsHeaders);
}
