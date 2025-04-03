document.getElementById("loginForm").addEventListener("submit", function (event) {
    event.preventDefault();
    
    const name = document.getElementById("name").value;
    const rollNo = document.getElementById("rollNo").value;

    fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, rollNo })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert("Login Successful!");
            document.getElementById("uploadSection").style.display = "block";
        } else {
            alert("Invalid Credentials");
        }
    });
});

function uploadAssignment() {
    const fileInput = document.getElementById("assignmentFile");
    const formData = new FormData();
    formData.append("assignment", fileInput.files[0]);

    fetch("/upload", {
        method: "POST",
        body: formData
    })
    .then(response => response.json())
    .then(data => alert(data.message))
    .catch(error => console.error("Error:", error));
}








   