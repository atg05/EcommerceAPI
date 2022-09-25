import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { BaseService } from '@shared/services/base.service';
import { AwsS3Service } from '@shared/aws/aws.service';
import { ImageService } from '@modules/image/image.service';
import { CategoryRepository } from './repositories/category.repository';
import { ICategoryDocument } from './interfaces/category.interface';
import { IAwsS3Response } from '@shared/aws/interfaces/aws.interface';

@Injectable()
export class CategoryService extends BaseService<CategoryRepository> {
  constructor(
    protected readonly repository: CategoryRepository,
    protected readonly awsService: AwsS3Service,
    protected readonly imageService: ImageService,
  ) {
    super();
  }
  async uploadImage(
    id: string | Types.ObjectId,
    file: Express.Multer.File,
  ): Promise<ICategoryDocument> {
    const category = await this.findById(id);

    if (category.image) {
      const image = await this.imageService.findById(category.image);

      await this.awsService.s3DeleteItemInBucket(image.pathWithFilename);

      await this.imageService.deleteById(image._id);
    }

    const aws: IAwsS3Response = await this.awsService.s3PutItemInBucket(
      category._id,
      file.buffer,
      {
        path: `images/categories`,
      },
    );

    const imageDoc = await this.imageService.create(aws);

    category.image = imageDoc._id;

    await category.save();

    return category;
  }
}
