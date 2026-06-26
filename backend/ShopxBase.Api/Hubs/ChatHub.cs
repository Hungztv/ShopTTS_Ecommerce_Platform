using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ShopxBase.Domain.Entities;
using ShopxBase.Infrastructure.Data;
using System.Security.Claims;

namespace ShopxBase.Api.Hubs
{
    [Authorize] // Yêu cầu JWT token để xác định User
    public class ChatHub : Hub
    {
        private readonly ShopxBaseDbContext _context;

        public ChatHub(ShopxBaseDbContext context)
        {
            _context = context;
        }

        // Gửi tin nhắn 1-1
        public async Task SendMessageToUser(string receiverId, string content)
        {
            var senderId = Context.UserIdentifier ?? Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(senderId)) return;

            // 1. Tìm hoặc tạo ChatSession
            var session = await _context.ChatSessions
                .FirstOrDefaultAsync(s => 
                    (s.User1Id == senderId && s.User2Id == receiverId) ||
                    (s.User1Id == receiverId && s.User2Id == senderId));

            if (session == null)
            {
                session = new ChatSession
                {
                    User1Id = senderId,
                    User2Id = receiverId,
                    LastMessageAt = DateTime.UtcNow
                };
                _context.ChatSessions.Add(session);
                await _context.SaveChangesAsync(); // Cần save để có Id
            }

            // 2. Lưu Message vào DB
            var message = new ChatMessage
            {
                SessionId = session.Id,
                SenderId = senderId,
                Content = content,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
            
            session.LastMessage = content;
            session.LastMessageAt = DateTime.UtcNow;

            _context.ChatMessages.Add(message);
            await _context.SaveChangesAsync();

            // 3. Gửi tin nhắn cho người nhận (nếu họ đang online)
            // SignalR tự động map UserIdentifier với các Connection của người đó
            await Clients.User(receiverId).SendAsync("ReceivePrivateMessage", new
            {
                id = message.Id,
                sessionId = session.Id,
                senderId = senderId,
                content = content,
                createdAt = message.CreatedAt
            });

            // Gửi lại cho chính người gửi (để cập nhật giao diện của các tab khác nếu họ mở nhiều tab)
            await Clients.User(senderId).SendAsync("ReceivePrivateMessage", new
            {
                id = message.Id,
                sessionId = session.Id,
                senderId = senderId,
                content = content,
                createdAt = message.CreatedAt
            });
        }

        public override async Task OnConnectedAsync()
        {
            var userId = Context.UserIdentifier ?? Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!string.IsNullOrEmpty(userId))
            {
                Console.WriteLine($"User {userId} connected to ChatHub with ConnectionId: {Context.ConnectionId}");
            }
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            await base.OnDisconnectedAsync(exception);
        }
    }
}
