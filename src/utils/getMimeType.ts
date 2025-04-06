import {proto} from "@whiskeysockets/baileys";

export function getMimeType(doc: proto.Message.IDocumentMessage): string {
    if (doc.fileName) {
        const mimeType = doc.fileName.split('.').at(1);
        if (mimeType) return mimeType;
    }

    const conversions: Record<string, string> = {
        "text/plain": "txt",
        "application/vnd.ms-excel": "xls",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
        "application/msword": "doc",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
        "application/vnd.ms-powerpoint": "ppt",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    }

    if (doc.mimetype) {
        return conversions[doc.mimetype] ?? doc.mimetype.split('/')[1];
    }

    return "application/octet-stream"
}