import { Controller, Get, Query } from '@nestjs/common';
import { Serialize } from '../../common/interceptors/serialize.interceptor';
import {
  ApiExtraModels,
  ApiOperation,
  ApiTags,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { GetTransactionsFilterDto } from '../transactions/dto/get-transactions.dto';
import {
  AnalyticsSummaryDto,
  CategoryDistributionDto,
  MonthlyTrendDto,
} from './dto/analytics-response.dto';
import {
  MonthlyForecastDto,
  ForecastErrorDto,
} from './dto/forecast-response.dto';
import { GetForecastDto } from './dto/get-forecast.dto';
import { ForecastResponse } from 'src/modules/science/dto/forecast-response.dto';
import { ApiScienceErrors } from '../science/api-science-errors.decorator';
import {
  BudgetAnalysisResponseDto,
  GetBudgetAnalysisDto,
} from './dto/budget-analysis.dto';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('forecast')
  @Serialize(MonthlyForecastDto)
  @ApiOperation({ summary: 'Predict financial flows for the next 3 months' })
  @ApiExtraModels(MonthlyForecastDto, ForecastErrorDto)
  @ApiResponse({
    status: 200,
    description:
      'A list of 3 monthly forecasts (Income, Expense, Balance), or an error object if the data is insufficient',
    schema: {
      oneOf: [
        { type: 'array', items: { $ref: getSchemaPath(MonthlyForecastDto) } },
        { $ref: getSchemaPath(ForecastErrorDto) },
      ],
    },
  })
  @ApiScienceErrors()
  async getForecast(@Query() query: GetForecastDto): Promise<ForecastResponse> {
    return this.analyticsService.getForecast(query.threshold ?? 0.2);
  }

  @Get('summary')
  @Serialize(AnalyticsSummaryDto)
  @ApiOperation({ summary: 'Get total income, expense and balance KPIs' })
  @ApiResponse({
    status: 200,
    description: 'Financial summary based on filters',
    type: AnalyticsSummaryDto,
  })
  async getSummary(
    @Query() filters: GetTransactionsFilterDto,
  ): Promise<AnalyticsSummaryDto> {
    return this.analyticsService.getSummary(filters);
  }

  @Get('distribution')
  @Serialize(CategoryDistributionDto)
  @ApiOperation({
    summary: 'Get expense distribution by category (for Pie Chart)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of categories and values',
    type: [CategoryDistributionDto], // Array response
  })
  async getDistribution(
    @Query() filters: GetTransactionsFilterDto,
  ): Promise<CategoryDistributionDto[]> {
    return this.analyticsService.getCategoryDistribution(filters);
  }

  @Get('trends/monthly')
  @Serialize(MonthlyTrendDto)
  @ApiOperation({ summary: 'Get monthly income/expense trends' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of monthly totals',
    type: [MonthlyTrendDto],
  })
  async getMonthlyTrends(
    @Query() filters: GetTransactionsFilterDto,
  ): Promise<MonthlyTrendDto[]> {
    return this.analyticsService.getMonthlyTrends(filters);
  }

  @Get('budget-analysis')
  @Serialize(BudgetAnalysisResponseDto)
  @ApiOperation({
    summary: 'Compare actual spending vs budget rules for a specific month',
  })
  @ApiResponse({
    status: 200,
    description: 'Hierarchical budget health status',
    type: BudgetAnalysisResponseDto,
  })
  async getBudgetAnalysis(
    @Query() query: GetBudgetAnalysisDto,
  ): Promise<BudgetAnalysisResponseDto> {
    return this.analyticsService.getBudgetAnalysis(query);
  }
}
