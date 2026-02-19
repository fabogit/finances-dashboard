import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Get,
  Query,
  Body,
  Param,
  Patch,
  Delete,
  ParseFilePipeBuilder,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { UploadTransactionResponseDto } from './dto/upload-transaction.dto';
import { GetTransactionsFilterDto } from './dto/get-transactions.dto';
import {
  PaginatedTransactionsResponseDto,
  TransactionDto,
} from './dto/transaction.dto';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
} from './dto/create-update-transaction.dto';

@ApiTags('Transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  // --- UPLOAD ---
  @Post('upload')
  @ApiOperation({ summary: 'Upload Excel export file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Bank export Excel file (.xlsx)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File processed successfully',
    type: UploadTransactionResponseDto,
  })
  @ApiResponse({ status: 422, description: 'File validation failed' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        .addMaxSizeValidator({ maxSize: 1024 * 1024 * 5 })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: Express.Multer.File,
  ): Promise<UploadTransactionResponseDto> {
    return this.transactionsService.uploadFile(file);
  }

  // --- READ (RAW) ---
  @Get('raw')
  @ApiOperation({ summary: 'Get all RAW transactions (Debug only)' })
  @ApiResponse({ status: 200, description: 'List of raw transactions' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  async findAllRaw() {
    return this.transactionsService.getAllRaw();
  }

  // --- READ (ENRICHED) ---
  @Get()
  @ApiOperation({ summary: 'Search and filter enriched transactions' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of enriched transactions',
    type: PaginatedTransactionsResponseDto,
  })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  async findAllEnriched(@Query() filters: GetTransactionsFilterDto) {
    return this.transactionsService.getAllEnriched(filters);
  }

  // --- CREATE ---
  @Post()
  @ApiOperation({ summary: 'Manually create a new transaction' })
  @ApiResponse({
    status: 201,
    description: 'Transaction created successfully',
    type: TransactionDto,
  })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  async create(@Body() createDto: CreateTransactionDto) {
    return this.transactionsService.create(createDto);
  }

  // --- UPDATE ---
  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing transaction' })
  @ApiResponse({
    status: 200,
    description: 'Transaction updated successfully',
    type: TransactionDto,
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(id, updateDto);
  }

  // --- DELETE ---
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a transaction' })
  @ApiResponse({
    status: 200,
    description: 'Transaction deleted successfully',
    type: TransactionDto,
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.transactionsService.delete(id);
  }
}
