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
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { UpdateAssetBalanceDto } from './dto/update-asset-balance.dto';
import { GetAssetQueryDto } from './dto/get-asset-query.dto'; // Importa il nuovo DTO
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Assets')
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new Asset' })
  @ApiResponse({ status: 201, description: 'Asset created successfully.' })
  create(@Body() createAssetDto: CreateAssetDto) {
    return this.assetsService.create(createAssetDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all assets' })
  findAll() {
    return this.assetsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get Asset details with history' })
  // Usa ValidationPipe con transform: true per attivare @Type(() => Number) nel DTO
  @UsePipes(new ValidationPipe({ transform: true }))
  findOne(
    @Param('id') id: string,
    @Query() query: GetAssetQueryDto, // <--- Qui usiamo il DTO
  ) {
    // query.historyLimit è garantito essere un numero o undefined (che diventa default nel DTO)
    return this.assetsService.findOne(id, query.historyLimit);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update asset details (name, institution, type)' })
  update(@Param('id') id: string, @Body() dto: UpdateAssetDto) {
    return this.assetsService.update(id, dto);
  }

  @Patch(':id/balance')
  @ApiOperation({ summary: 'Update asset value and record history snapshot' })
  updateBalance(@Param('id') id: string, @Body() dto: UpdateAssetBalanceDto) {
    return this.assetsService.updateBalance(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete asset and its history' })
  remove(@Param('id') id: string) {
    return this.assetsService.remove(id);
  }
}
