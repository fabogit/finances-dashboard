import {
  Controller,
  Post,
  Get,
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
  HttpStatus,
  UsePipes,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiConsumes,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { UploadTransactionResponseDto } from './dto/upload-transaction-response.dto';
import { GetTransactionsFilterDto } from './dto/get-transactions.dto';
import { PaginatedTransactionsResponseDto } from './dto/transaction-response.dto';

@ApiTags('Transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

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
    description: 'File processed successfully with science enrichment results',
    type: UploadTransactionResponseDto,
  })
  @ApiResponse({
    status: 422,
    description: 'File validation failed (type or size)',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        .addMaxSizeValidator({
          maxSize: 1024 * 1024 * 5, // 5MB
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: Express.Multer.File,
  ): Promise<UploadTransactionResponseDto> {
    return this.transactionsService.uploadFile(file);
  }

  @Get('raw')
  @ApiOperation({ summary: 'Get all RAW transactions (Debug only)' })
  @ApiResponse({
    status: 200,
    description: 'List of raw transactions direct from DB',
  })
  async findAllRaw() {
    return this.transactionsService.getAllTransactionsRaw();
  }

  @Get()
  @ApiOperation({ summary: 'Search and filter enriched transactions' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of enriched transactions',
    type: PaginatedTransactionsResponseDto,
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async findAllEnriched(@Query() filters: GetTransactionsFilterDto) {
    return this.transactionsService.getTransactionsEnriched(filters);
  }
}
