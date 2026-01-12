import {
  Controller,
  Get,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { GetTransactionsFilterDto } from '../transactions/dto/get-transactions.dto';
import { ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import {
  AnalyticsSummaryDto,
  CategoryDistributionDto,
  DailyTrendDto,
} from './dto/analytics-response.dto';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get total income, expense and balance KPIs' })
  @ApiResponse({
    status: 200,
    description: 'Financial summary based on filters',
    type: AnalyticsSummaryDto,
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getSummary(
    @Query() filters: GetTransactionsFilterDto,
  ): Promise<AnalyticsSummaryDto> {
    return this.analyticsService.getSummary(filters);
  }

  @Get('distribution')
  @ApiOperation({
    summary: 'Get expense distribution by category (for Pie Chart)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of categories and values',
    type: [CategoryDistributionDto], // Array response
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getDistribution(
    @Query() filters: GetTransactionsFilterDto,
  ): Promise<CategoryDistributionDto[]> {
    return this.analyticsService.getCategoryDistribution(filters);
  }

  @Get('trend')
  @ApiOperation({ summary: 'Get daily income/expense trend (for Bar Chart)' })
  @ApiResponse({
    status: 200,
    description: 'Time series data grouped by day',
    type: [DailyTrendDto], // Array
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getTrend(
    @Query() filters: GetTransactionsFilterDto,
  ): Promise<DailyTrendDto[]> {
    return this.analyticsService.getDailyTrend(filters);
  }
}
