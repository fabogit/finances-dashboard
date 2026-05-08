import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Serialize } from '../../common/interceptors/serialize.interceptor';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { UpdateAssetBalanceDto } from './dto/update-asset-balance.dto';
import { GetAssetQueryDto } from './dto/get-asset-query.dto';
import { AssetResponseDto } from './dto/asset-response.dto';
import { RecalculateBalanceResponseDto } from './dto/recalculate-balance-response.dto';

@ApiTags('Assets')
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  @Serialize(AssetResponseDto)
  @ApiOperation({ summary: 'Create a new Asset' })
  @ApiResponse({
    status: 201,
    description: 'Asset created successfully.',
    type: AssetResponseDto,
  })
  async create(@Body() body: CreateAssetDto) {
    return this.assetsService.create(body);
  }

  @Get()
  @Serialize(AssetResponseDto)
  @ApiOperation({ summary: 'List all assets' })
  @ApiResponse({
    status: 200,
    description: 'List of all assets',
    type: [AssetResponseDto],
  })
  async findAll() {
    return this.assetsService.findAll();
  }

  @Get(':id')
  @Serialize(AssetResponseDto)
  @ApiOperation({
    summary: 'Get asset details with history',
    description:
      'Returns the full details of a specific asset, including its current balance and configuration, plus a list of its value history snapshots.',
  })
  @ApiResponse({
    status: 200,
    description: 'Asset details including history found and returned.',
    type: AssetResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Asset not found.' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async findOne(@Param('id') id: string, @Query() query: GetAssetQueryDto) {
    return this.assetsService.findOne(id, query.historyLimit);
  }

  @Patch(':id')
  @Serialize(AssetResponseDto)
  @ApiOperation({ summary: 'Update asset details (name, institution, type)' })
  @ApiResponse({
    status: 200,
    description: 'Asset updated successfully',
    type: AssetResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async update(@Param('id') id: string, @Body() body: UpdateAssetDto) {
    return this.assetsService.update(id, body);
  }

  @Patch(':id/balance')
  @Serialize(AssetResponseDto)
  @ApiOperation({ summary: 'Update asset value and record history snapshot' })
  @ApiResponse({
    status: 200,
    description: 'Asset balance updated successfully',
    type: AssetResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async updateBalance(
    @Param('id') id: string,
    @Body() body: UpdateAssetBalanceDto,
  ) {
    return this.assetsService.updateBalance(id, body);
  }

  @Post(':id/recalculate')
  @Serialize(RecalculateBalanceResponseDto)
  @ApiOperation({
    summary: 'Recalculate balance from transactions',
    description:
      'Triggers an atomic recalculation of the asset balance based on all linked transactions. Useful for correcting sync drifts.',
  })
  @ApiResponse({
    status: 200,
    description: 'Balance recalculated successfully.',
    type: RecalculateBalanceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Asset not found.' })
  async recalculateBalance(@Param('id') id: string) {
    return this.assetsService.recalculateBalance(id);
  }

  @Delete(':id')
  @Serialize(AssetResponseDto)
  @ApiOperation({ summary: 'Delete asset and its history' })
  @ApiResponse({
    status: 200,
    description: 'Asset deleted successfully',
    type: AssetResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async remove(@Param('id') id: string) {
    return this.assetsService.remove(id);
  }
}
