import {
  Controller,
  Post,
  Get,
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiConsumes,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Query } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { UploadTransactionResponseDto } from './dto/upload-transaction-response.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@ApiTags('transactions')
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
    description: 'File processed successfully',
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
          maxSize: 1024 * 1024 * 5,
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: Express.Multer.File,
  ): Promise<UploadTransactionResponseDto> {
    return this.transactionsService.uploadFile(file);
  }

  @Get()
  @ApiOperation({ summary: 'Get all raw transactions' })
  @ApiResponse({ status: 200, description: 'List of raw transactions' })
  async findAll(@Query() query: PaginationQueryDto) {
    return this.transactionsService.getAllTransactions(query);
  }
}
