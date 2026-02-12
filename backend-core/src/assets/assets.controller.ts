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
  findAll() {
    return this.assetsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get Asset details with history' })
  @UsePipes(new ValidationPipe({ transform: true }))
  findOne(@Param('id') id: string, @Query() query: GetAssetQueryDto) {
    return this.assetsService.findOne(id, query.historyLimit);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update asset details (name, institution, type)' })
  update(@Param('id') id: string, @Body() body: UpdateAssetDto) {
    return this.assetsService.update(id, body);
  }

  @Patch(':id/balance')
  @ApiOperation({ summary: 'Update asset value and record history snapshot' })
  updateBalance(@Param('id') id: string, @Body() body: UpdateAssetBalanceDto) {
    return this.assetsService.updateBalance(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete asset and its history' })
  remove(@Param('id') id: string) {
    return this.assetsService.remove(id);
  }
}
