using Microsoft.AspNetCore.SignalR;

namespace ShopxBase.Api.Hubs
{
    public class ChatHub : Hub
    {
        // Gửi tin nhắn tới tất cả client đang kết nối
        public async Task SendMessage(string user, string message)
        {
            await Clients.All.SendAsync("ReceiveMessage", user, message);
        }

        // Tùy chọn: Xử lý khi có client kết nối
        public override async Task OnConnectedAsync()
        {
            await Clients.All.SendAsync("UserConnected", Context.ConnectionId);
            await base.OnConnectedAsync();
        }

        // Tùy chọn: Xử lý khi có client ngắt kết nối
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            await Clients.All.SendAsync("UserDisconnected", Context.ConnectionId);
            await base.OnDisconnectedAsync(exception);
        }
    }
}
