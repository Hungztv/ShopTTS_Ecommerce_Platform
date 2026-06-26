using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShopxBase.Domain.Entities;
using ShopxBase.Infrastructure.Data;
using System.Security.Claims;

namespace ShopxBase.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize] // Yêu cầu đăng nhập
public class ChatController : ControllerBase
{
    private readonly ShopxBaseDbContext _context;

    public ChatController(ShopxBaseDbContext context)
    {
        _context = context;
    }

    // Lấy danh sách bạn chat (Inbox)
    [HttpGet("inbox")]
    public async Task<IActionResult> GetInbox()
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

        var sessions = await _context.ChatSessions
            .Include(s => s.User1)
            .Include(s => s.User2)
            .Where(s => s.User1Id == currentUserId || s.User2Id == currentUserId)
            .OrderByDescending(s => s.LastMessageAt)
            .Select(s => new
            {
                s.Id,
                OtherUser = s.User1Id == currentUserId ? 
                    new { s.User2.Id, s.User2.FullName, s.User2.Avatar } : 
                    new { s.User1.Id, s.User1.FullName, s.User1.Avatar },
                s.LastMessage,
                s.LastMessageAt
            })
            .ToListAsync();

        return Ok(sessions);
    }

    // Lấy lịch sử chat với 1 người
    // Nếu chưa có session, tạo session mới
    [HttpGet("history/{otherUserId}")]
    public async Task<IActionResult> GetHistory(string otherUserId)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

        var session = await _context.ChatSessions
            .Include(s => s.Messages)
            .FirstOrDefaultAsync(s => 
                (s.User1Id == currentUserId && s.User2Id == otherUserId) ||
                (s.User1Id == otherUserId && s.User2Id == currentUserId));

        if (session == null)
        {
            // Kiểm tra xem otherUserId có tồn tại không
            var otherUser = await _context.Users.FindAsync(otherUserId);
            if (otherUser == null) return NotFound("User not found");

            // Tạo session mới nhưng chưa lưu message
            session = new ChatSession
            {
                User1Id = currentUserId,
                User2Id = otherUserId,
                LastMessageAt = DateTime.UtcNow
            };
            _context.ChatSessions.Add(session);
            await _context.SaveChangesAsync();
            
            return Ok(new { SessionId = session.Id, Messages = new List<object>() });
        }

        var messages = session.Messages
            .OrderBy(m => m.CreatedAt)
            .Select(m => new
            {
                m.Id,
                m.SenderId,
                m.Content,
                m.CreatedAt,
                m.IsRead
            })
            .ToList();

        return Ok(new { SessionId = session.Id, Messages = messages });
    }
}
