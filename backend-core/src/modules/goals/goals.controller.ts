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
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { GetGoalQueryDto } from './dto/get-goal-query.dto';
import { GoalResponseDto } from './dto/goal-response.dto';
import { GoalProjectionResponseDto } from '../science/dto/goal-projection-response.dto';
import { Serialize } from '../../common/interceptors/serialize.interceptor';

@ApiTags('Savings Goals')
@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  @Serialize(GoalResponseDto)
  @ApiOperation({ summary: 'Create a new savings goal' })
  @ApiResponse({
    status: 201,
    description: 'Goal created successfully.',
    type: GoalResponseDto,
  })
  create(@Body() body: CreateGoalDto) {
    return this.goalsService.create(body);
  }

  @Get()
  @Serialize(GoalResponseDto)
  @ApiOperation({ summary: 'List all goals (Active first)' })
  @ApiResponse({
    status: 200,
    description: 'List of all savings goals',
    type: [GoalResponseDto],
  })
  findAll() {
    return this.goalsService.findAll();
  }

  @Get(':id')
  @Serialize(GoalResponseDto)
  @ApiOperation({
    summary: 'Get Goal details with recent transactions',
    description:
      'Returns a specific savings goal with internal progress details and a list of contributing transactions based on the provided limit.',
  })
  @ApiResponse({
    status: 200,
    description: 'Goal details retrieved successfully.',
    type: GoalResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Goal not found.' })
  @UsePipes(new ValidationPipe({ transform: true }))
  findOne(@Param('id') id: string, @Query() query: GetGoalQueryDto) {
    return this.goalsService.findOne(id, query.transactionLimit);
  }

  @Patch(':id')
  @Serialize(GoalResponseDto)
  @ApiOperation({ summary: 'Update goal details (name, target, deadline)' })
  @ApiResponse({
    status: 200,
    description: 'Goal updated successfully',
    type: GoalResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Goal not found' })
  update(@Param('id') id: string, @Body() body: UpdateGoalDto) {
    return this.goalsService.update(id, body);
  }

  @Delete(':id')
  @Serialize(GoalResponseDto)
  @ApiOperation({ summary: 'Delete a goal' })
  @ApiResponse({
    status: 200,
    description: 'Goal deleted successfully',
    type: GoalResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Goal not found' })
  remove(@Param('id') id: string) {
    return this.goalsService.remove(id);
  }

  @Get(':id/projection')
  @Serialize(GoalProjectionResponseDto)
  @ApiOperation({
    summary: 'Get Savings Goal completion projection',
    description:
      'Calculates the estimated completion date and monthly savings velocity for a goal using ML linear regression in the Science Service. Requires historical transaction data.',
  })
  @ApiResponse({
    status: 200,
    description: 'Goal projection retrieved successfully.',
    type: GoalProjectionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Goal not found or insufficient data for projection.',
  })
  getProjection(@Param('id') id: string) {
    return this.goalsService.getProjection(id);
  }
}
