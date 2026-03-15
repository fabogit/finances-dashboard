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
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { UpdateAssetBalanceDto } from './dto/update-asset-balance.dto';
import { GetAssetQueryDto } from './dto/get-asset-query.dto';

@ApiTags('Assets')
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new Asset' })
  @ApiResponse({ status: 201, description: 'Asset created successfully.' })
  create(@Body() body: CreateAssetDto) {
    return this.assetsService.create(body);
  }

  @Get()
  @ApiOperation({ summary: 'List all assets' })
  @ApiResponse({
    status: 200,
    description: 'List of all assets',
    type: [CreateAssetDto],
  })
  findAll() {
    return this.assetsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get Asset details with history' })
  @ApiResponse({ status: 200, description: 'Asset details including history' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  @UsePipes(new ValidationPipe({ transform: true }))
  findOne(@Param('id') id: string, @Query() query: GetAssetQueryDto) {
    return this.assetsService.findOne(id, query.historyLimit);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update asset details (name, institution, type)' })
  @ApiResponse({ status: 200, description: 'Asset updated successfully' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  update(@Param('id') id: string, @Body() body: UpdateAssetDto) {
    return this.assetsService.update(id, body);
  }

  @Patch(':id/balance')
  @ApiOperation({ summary: 'Update asset value and record history snapshot' })
  @ApiResponse({
    status: 200,
    description: 'Asset balance updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  updateBalance(@Param('id') id: string, @Body() body: UpdateAssetBalanceDto) {
    return this.assetsService.updateBalance(id, body);
  }

  @Post(':id/recalculate')
  @ApiOperation({
    summary: 'Recalculate asset balance based on history and transactions',
  })
  recalculateBalance(@Param('id') id: string) {
    return this.assetsService.recalculateBalance(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete asset and its history' })
  @ApiResponse({ status: 200, description: 'Asset deleted successfully' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  remove(@Param('id') id: string) {
    return this.assetsService.remove(id);
  }
}
