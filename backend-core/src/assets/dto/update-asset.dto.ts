import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateAssetDto } from './create-asset.dto';

// We remove 'balance' because it should be updated only via a dedicated endpoint that manages the history
export class UpdateAssetDto extends PartialType(
  OmitType(CreateAssetDto, ['balance'] as const),
) {}
