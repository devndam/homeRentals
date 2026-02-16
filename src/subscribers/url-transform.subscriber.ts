import { EventSubscriber, EntitySubscriberInterface, LoadEvent } from 'typeorm';
import { PropertyImage } from '../modules/properties/property-image.entity';
import { User } from '../modules/users/user.entity';
import { Agreement } from '../modules/agreements/agreement.entity';
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

    if (entity instanceof Agreement) {
      if (entity.pdfUrl) entity.pdfUrl = toFullUrl(entity.pdfUrl);
    }
  }
}
