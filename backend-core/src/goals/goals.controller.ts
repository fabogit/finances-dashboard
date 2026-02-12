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

@ApiTags('Savings Goals')
@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new savings goal' })
  @ApiResponse({ status: 201, description: 'Goal created successfully.' })
  create(@Body() body: CreateGoalDto) {
    return this.goalsService.create(body);
  }

  @Get()
  @ApiOperation({ summary: 'List all goals (Active first)' })
  findAll() {
    return this.goalsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get Goal details with recent transactions' })
  @UsePipes(new ValidationPipe({ transform: true }))
  findOne(@Param('id') id: string, @Query() query: GetGoalQueryDto) {
    return this.goalsService.findOne(id, query.transactionLimit);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update goal details (name, target, deadline)' })
  update(@Param('id') id: string, @Body() body: UpdateGoalDto) {
    return this.goalsService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a goal' })
  remove(@Param('id') id: string) {
    return this.goalsService.remove(id);
  }
}
