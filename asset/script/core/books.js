export const DEFAULT_BOOK_ID = "978-4866395708";

export function lessonKey(bookId, lessonId) {
  return bookId === DEFAULT_BOOK_ID ? lessonId : `${bookId}__${lessonId}`;
}

export function bookIdOfDoc(docId, data) {
  const i = docId.indexOf("__");
  if (i === -1) return DEFAULT_BOOK_ID;
  return (data && data.bookId) || docId.slice(0, i);
}

export function lessonIdOfDoc(docId, data) {
  if (data && data.lessonId) return data.lessonId;
  const i = docId.indexOf("__");
  return i === -1 ? docId : docId.slice(i + 2);
}
