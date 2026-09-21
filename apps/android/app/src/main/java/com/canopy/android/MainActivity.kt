package com.canopy.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.canopy.android.data.*
import com.canopy.android.ui.theme.CanopyTheme
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { CanopyTheme { CanopyApp() } }
    }
}

class CanopyViewModel : ViewModel() {
    private val api = CanopyApi("http://10.0.2.2:3000/v1") { token }
    var token by mutableStateOf<String?>(null)
    var projects by mutableStateOf<List<ProjectDto>>(emptyList())
    var lineage by mutableStateOf(LineageDto())
    var selectedProject by mutableStateOf<ProjectDto?>(null)
    var selectedVersion by mutableStateOf<VersionDto?>(null)
    var assetUrl by mutableStateOf<String?>(null)
    var copilotAnswer by mutableStateOf("")
    var loading by mutableStateOf(false)
    var error by mutableStateOf<String?>(null)

    fun login(email: String, password: String) = viewModelScope.launch {
        runCatching { api.login(email, password) }
            .onSuccess { token = it.accessToken; loadProjects() }
            .onFailure { error = it.message }
    }

    fun loadProjects() = viewModelScope.launch {
        loading = true
        runCatching { api.projects().data }
            .onSuccess { projects = it }
            .onFailure { error = it.message }
        loading = false
    }

    fun openProject(project: ProjectDto) = viewModelScope.launch {
        selectedProject = project
        loading = true
        runCatching { api.lineage(project.id) }
            .onSuccess { lineage = it; selectedVersion = it.versions.lastOrNull() }
            .onFailure { error = it.message }
        loading = false
    }

    fun openVersion(version: VersionDto) = viewModelScope.launch {
        selectedVersion = version
        assetUrl = version.assetId?.let { runCatching { api.assetUrl(it).url }.getOrNull() }
    }

    fun askCopilot(question: String) {
        copilotAnswer = "Copilot is available through the Canopy API SSE endpoint; streaming is enabled in the shared backend and displayed on Web in Phase 4."
    }
}

@Composable
fun CanopyApp(vm: CanopyViewModel = remember { CanopyViewModel() }) {
    Surface(Modifier.fillMaxSize(), color = CanopyColors.Background) {
        when {
            vm.token == null -> LoginScreen(vm)
            vm.selectedProject == null -> ProjectsScreen(vm)
            else -> Row(Modifier.fillMaxSize()) {
                LineageScreen(vm, Modifier.weight(0.42f))
                VersionDetailScreen(vm, Modifier.weight(0.58f))
            }
        }
    }
}

@Composable
fun LoginScreen(vm: CanopyViewModel) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center) {
        Text("CANOPY", color = CanopyColors.Muted)
        Text("Creative workspace", color = CanopyColors.Primary, style = MaterialTheme.typography.headlineSmall)
        OutlinedTextField(email, { email = it }, label = { Text("Email") }, modifier = Modifier.fillMaxWidth().padding(top = 16.dp))
        OutlinedTextField(password, { password = it }, label = { Text("Password") }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
        Button(onClick = { vm.login(email, password) }, modifier = Modifier.fillMaxWidth().padding(top = 16.dp)) { Text("Sign in") }
        vm.error?.let { Text(it, color = CanopyColors.Error, modifier = Modifier.padding(top = 12.dp)) }
    }
}

@Composable
fun ProjectsScreen(vm: CanopyViewModel) {
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Projects", color = CanopyColors.Primary, style = MaterialTheme.typography.headlineSmall)
        if (vm.loading) LinearProgressIndicator(Modifier.fillMaxWidth().padding(top = 8.dp))
        if (vm.projects.isEmpty() && !vm.loading) Text("No projects yet.", color = CanopyColors.Secondary, modifier = Modifier.padding(top = 16.dp))
        LazyColumn(Modifier.padding(top = 12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(vm.projects) { project ->
                CanopyCard(Modifier.clickable { vm.openProject(project) }) {
                    Text(project.name, color = CanopyColors.Primary)
                    Text(project.creativeGoal ?: "No goal set", color = CanopyColors.Secondary)
                    Text(project.updatedAt ?: "", color = CanopyColors.Muted, style = MaterialTheme.typography.labelSmall)
                }
            }
        }
    }
}

@Composable
fun LineageScreen(vm: CanopyViewModel, modifier: Modifier = Modifier) {
    Column(modifier.fillMaxHeight().background(CanopyColors.Surface).padding(12.dp)) {
        Text(vm.selectedProject?.name ?: "Lineage", color = CanopyColors.Primary)
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 12.dp)) {
            items(vm.lineage.versions) { version ->
                CanopyCard(Modifier.clickable { vm.openVersion(version) }) {
                    Text("V${version.sequence}", color = if (version.actorType == "human") CanopyColors.Human else CanopyColors.Ai)
                    Text(version.actorType ?: "unknown", color = CanopyColors.Secondary)
                }
            }
        }
    }
}

@Composable
fun VersionDetailScreen(vm: CanopyViewModel, modifier: Modifier = Modifier) {
    val version = vm.selectedVersion
    var question by remember { mutableStateOf("") }
    Column(modifier.fillMaxHeight().padding(12.dp)) {
        if (version == null) {
            Text("Select a version", color = CanopyColors.Secondary)
            return@Column
        }
        vm.assetUrl?.let { AsyncImage(model = it, contentDescription = "Version asset", modifier = Modifier.fillMaxWidth().height(220.dp).background(CanopyColors.Elevated)) }
        Text("V${version.sequence}", color = CanopyColors.Primary, style = MaterialTheme.typography.headlineSmall)
        Text("Action: ${version.action?.type ?: "unknown"}", color = CanopyColors.Secondary)
        Text("Actor: ${version.actorType ?: "unknown"}", color = CanopyColors.Secondary)
        version.actorModel?.let { Text("Model: $it", color = CanopyColors.Muted) }
        Text("Version ID: ${version.id}", color = CanopyColors.Muted, style = MaterialTheme.typography.labelSmall)
        OutlinedTextField(question, { question = it }, label = { Text("Ask Copilot") }, modifier = Modifier.fillMaxWidth().padding(top = 16.dp))
        Button(onClick = { vm.askCopilot(question) }, enabled = question.isNotBlank(), modifier = Modifier.padding(top = 8.dp)) { Text("Ask") }
        if (vm.copilotAnswer.isNotBlank()) Text(vm.copilotAnswer, color = CanopyColors.Secondary, modifier = Modifier.padding(top = 12.dp))
    }
}

@Composable
fun CanopyCard(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Column(modifier.background(CanopyColors.Elevated).padding(12.dp), content = content)
}

object CanopyColors {
    val Background = Color(0xFF0B0D10)
    val Surface = Color(0xFF11151A)
    val Elevated = Color(0xFF171B21)
    val Primary = Color(0xFFF5F7FA)
    val Secondary = Color(0xFF9AA4B2)
    val Muted = Color(0xFF667085)
    val Ai = Color(0xFF7C3AED)
    val Human = Color(0xFF38BDF8)
    val Error = Color(0xFFEF4444)
}
