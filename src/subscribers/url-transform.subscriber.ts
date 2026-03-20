import { EventSubscriber, EntitySubscriberInterface, LoadEvent } from 'typeorm';
import { PropertyImage } from '../modules/properties/property-image.entity';
import { User } from '../modules/users/user.entity';
import { Invoice } from '../modules/invoices/invoice.entity';
import { LegalDocumentTemplate } from '../modules/legal-documents/legal-document-template.entity';
import { LegalDocument } from '../modules/legal-documents/legal-document.entity';
import { toFullUrl } from '../utils/url';

@EventSubscriber()
export class UrlTransformSubscriber implements EntitySubscriberInterface {
  afterLoad(entity: any, event?: LoadEvent<any>): void {
    if (entity instanceof PropertyImage) {
      entity.url = toFullUrl(entity.url)!;
      if (entity.thumbnailUrl) entity.thumbnailUrl = toFullUrl(entity.thumbnailUrl);
    }

    if (entity instanceof User) {
      if (entity.avatarUrl) entity.avatarUrl = toFullUrl(entity.avatarUrl);
    }

    if (entity instanceof Invoice) {
      if (entity.pdfUrl) entity.pdfUrl = toFullUrl(entity.pdfUrl);
    }

    if (entity instanceof LegalDocumentTemplate) {
      if (entity.fileUrl) entity.fileUrl = toFullUrl(entity.fileUrl)!;
    }

    if (entity instanceof LegalDocument) {
      if (entity.documentUrl) entity.documentUrl = toFullUrl(entity.documentUrl)!;
    }
  }
}
