import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CHAT_ROUTES, CHAT_ROUTE_DESCRIPTIONS } from './chat.routes';
import {
  CreateConversationDto,
  UpdateConversationDto,
  SendMessageDto,
  EstimateCostDto,
} from './dto';
import { JwtAuthGuard } from '@common/guards';
import { CurrentUser, CurrentUserData } from '@common/decorators';

@ApiTags('chat')
@Controller(CHAT_ROUTES.BASE)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ============ PUBLIC ROUTES ============

  @Get(CHAT_ROUTES.MODELS)
  @ApiOperation({ summary: CHAT_ROUTE_DESCRIPTIONS.MODELS })
  @ApiResponse({ status: 200, description: 'List of chat models' })
  async getModels() {
    return this.chatService.getModels();
  }

  @Post(CHAT_ROUTES.ESTIMATE)
  @ApiOperation({ summary: CHAT_ROUTE_DESCRIPTIONS.ESTIMATE })
  @ApiResponse({ status: 200, description: 'Estimated cost' })
  async estimateCost(@Body() dto: EstimateCostDto) {
    return this.chatService.estimateCost(dto);
  }

  // ============ PROTECTED ROUTES ============

  @Get(CHAT_ROUTES.CONVERSATIONS)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: CHAT_ROUTE_DESCRIPTIONS.LIST_CONVERSATIONS })
  @ApiResponse({ status: 200, description: 'List of conversations' })
  async listConversations(@CurrentUser() user: CurrentUserData) {
    return this.chatService.listConversations(user.id);
  }

  @Post(CHAT_ROUTES.CONVERSATIONS)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: CHAT_ROUTE_DESCRIPTIONS.CREATE_CONVERSATION })
  @ApiResponse({ status: 201, description: 'Conversation created' })
  async createConversation(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateConversationDto,
  ) {
    return this.chatService.createConversation(user.id, dto);
  }

  @Get(CHAT_ROUTES.CONVERSATION_BY_ID)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: CHAT_ROUTE_DESCRIPTIONS.GET_CONVERSATION })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Conversation with messages' })
  async getConversation(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.chatService.getConversation(user.id, id);
  }

  @Patch(CHAT_ROUTES.CONVERSATION_BY_ID)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: CHAT_ROUTE_DESCRIPTIONS.UPDATE_CONVERSATION })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Conversation updated' })
  async updateConversation(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.chatService.updateConversation(user.id, id, dto);
  }

  @Delete(CHAT_ROUTES.CONVERSATION_BY_ID)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: CHAT_ROUTE_DESCRIPTIONS.DELETE_CONVERSATION })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Conversation deleted' })
  async deleteConversation(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.chatService.deleteConversation(user.id, id);
  }

  @Post(CHAT_ROUTES.MESSAGES)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: CHAT_ROUTE_DESCRIPTIONS.SEND_MESSAGE })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 201, description: 'Message sent and response received' })
  async sendMessage(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(user.id, id, dto);
  }
}
